import { createHash, randomBytes } from "crypto";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/mailer";

const INVITE_TTL_MS = 1000 * 60 * 60 * 48; // 48h
const MAX_LOGO_BYTES = 512 * 1024; // 512 Ko

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

function slugCode(raw: string) {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 32);
}

const MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
};

/**
 * Enregistre le logo de façon durable.
 * Avant : public/uploads/ (invisible en production serverless).
 * Maintenant : S3 si AWS_S3_BUCKET, sinon data-URL en base.
 */
export async function saveBankLogo(file: File, bankId: string) {
  if (file.size <= 0) throw new Error("Fichier logo vide");
  if (file.size > MAX_LOGO_BYTES) {
    throw new Error("Logo trop volumineux (maximum 512 Ko)");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = (file.name.split(".").pop() || "png")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const safeExt = Object.keys(MIME_BY_EXT).includes(ext) ? ext : "png";
  const mime =
    (file.type && file.type.startsWith("image/")
      ? file.type
      : MIME_BY_EXT[safeExt]) || "image/png";

  const bucket = process.env.AWS_S3_BUCKET?.trim();
  if (
    bucket &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY
  ) {
    try {
      const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
      const region = process.env.AWS_REGION || "us-east-1";
      const key = `banks/${bankId}.${safeExt}`;
      const client = new S3Client({ region });
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: bytes,
          ContentType: mime,
          CacheControl: "public, max-age=31536000, immutable",
        }),
      );
      const publicBase = process.env.AWS_S3_PUBLIC_URL?.replace(/\/$/, "");
      if (publicBase) return `${publicBase}/${key}`;
      return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    } catch (err) {
      console.error("[saveBankLogo] S3 failed, fallback data-URL", err);
    }
  }

  return `data:${mime};base64,${bytes.toString("base64")}`;
}

/** Anciens chemins locaux /uploads/... cassés hors machine d'upload. */
export function isLegacyLocalLogo(url: string | null | undefined) {
  return !!url && url.startsWith("/uploads/");
}

export async function createPartnerBank(input: {
  name: string;
  shortName: string;
  code: string;
  email: string;
  logoFile?: File | null;
}) {
  const email = input.email.trim().toLowerCase();
  const code = slugCode(input.code || input.shortName);

  if (!code) throw new Error("Code banque invalide");
  if (!email.includes("@")) throw new Error("E-mail invalide");

  const existing = await prisma.partnerBank.findFirst({
    where: { OR: [{ email }, { code }] },
  });
  if (existing) throw new Error("Une banque avec cet e-mail ou ce code existe déjà");

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) throw new Error("Cet e-mail est déjà utilisé par un compte");

  const user = await prisma.user.create({
    data: {
      name: input.name.trim(),
      email,
      emailVerified: true,
      role: "BANK",
    },
  });

  // Compte credential sans mot de passe — défini via l'invitation
  await prisma.account.create({
    data: {
      userId: user.id,
      accountId: email,
      providerId: "credential",
      password: null,
    },
  });

  const bank = await prisma.partnerBank.create({
    data: {
      name: input.name.trim(),
      shortName: input.shortName.trim(),
      code,
      email,
      userId: user.id,
      invitedAt: new Date(),
      oauthClientSecret: randomBytes(32).toString("hex"),
      interopMode: "SIMULATED",
    },
  });

  let logoUrl: string | null = null;
  if (input.logoFile && input.logoFile.size > 0) {
    logoUrl = await saveBankLogo(input.logoFile, bank.id);
    await prisma.partnerBank.update({
      where: { id: bank.id },
      data: { logoUrl },
    });
  }

  await sendBankInvite(bank.id);

  return prisma.partnerBank.findUniqueOrThrow({
    where: { id: bank.id },
    include: { user: { select: { id: true, email: true, role: true } } },
  });
}

export async function sendBankInvite(bankId: string) {
  const bank = await prisma.partnerBank.findUnique({ where: { id: bankId } });
  if (!bank) throw new Error("Banque introuvable");

  const raw = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(raw).digest("hex");

  await prisma.bankInviteToken.updateMany({
    where: { bankId, usedAt: null },
    data: { usedAt: new Date() },
  });

  await prisma.bankInviteToken.create({
    data: {
      bankId,
      token: tokenHash,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    },
  });

  await prisma.partnerBank.update({
    where: { id: bankId },
    data: { invitedAt: new Date() },
  });

  const link = `${appUrl()}/bank/set-password?token=${raw}`;

  await sendEmail({
    to: bank.email,
    subject: `Invitation ekonzo — activez l'espace ${bank.shortName}`,
    text: `Bonjour,\n\nLe Ministère des Finances vous invite à activer l'espace banque « ${bank.name} » sur ekonzo.\n\nIdentifiant de connexion : ${bank.email}\n\nDéfinissez votre mot de passe via ce lien (valable 48 h) :\n${link}\n\nCordialement,\nekonzo`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <h2 style="color:#17418a;margin:0 0 12px">ekonzo</h2>
        <p>Le Ministère des Finances vous invite à activer l'espace banque <strong>${bank.name}</strong>.</p>
        <p>Identifiant de connexion : <strong>${bank.email}</strong></p>
        <p style="margin:24px 0">
          <a href="${link}" style="background:#17418a;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block">
            Définir mon mot de passe
          </a>
        </p>
        <p style="color:#5a5a58;font-size:13px">Ce lien expire dans 48 heures.</p>
      </div>
    `,
  });

  return { email: bank.email, link };
}

export async function activateBankPassword(rawToken: string, password: string) {
  if (password.length < 8) throw new Error("Mot de passe : 8 caractères minimum");

  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const invite = await prisma.bankInviteToken.findUnique({
    where: { token: tokenHash },
    include: { bank: true },
  });

  if (!invite || invite.usedAt) throw new Error("Lien d'invitation invalide ou déjà utilisé");
  if (invite.expiresAt.getTime() < Date.now()) {
    throw new Error("Lien d'invitation expiré");
  }
  if (!invite.bank.userId) throw new Error("Compte banque introuvable");

  const hashed = await hash(password, 12);

  await prisma.account.updateMany({
    where: {
      userId: invite.bank.userId,
      providerId: "credential",
    },
    data: { password: hashed },
  });

  await prisma.bankInviteToken.update({
    where: { id: invite.id },
    data: { usedAt: new Date() },
  });

  await prisma.partnerBank.update({
    where: { id: invite.bankId },
    data: { activatedAt: new Date(), isActive: true },
  });

  return { email: invite.bank.email, bankName: invite.bank.shortName };
}

export async function getBankByUserId(userId: string) {
  return prisma.partnerBank.findUnique({ where: { userId } });
}

export async function listPartnerBanks() {
  return prisma.partnerBank.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, email: true, banned: true } },
      _count: {
        select: {
          links: true,
          paymentSessions: { where: { status: "PAID" } },
        },
      },
    },
  });
}
