import { createHash } from "crypto";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { generateBankOAuthCredentials } from "@/modules/banks/oauth-credentials";
import { normalizeBankPageUrl } from "@/modules/banks/bank-urls";

const MAX_LOGO_BYTES = 512 * 1024; // 512 Ko

function slugCode(raw: string) {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 32);
}

export { generateBankOAuthCredentials } from "@/modules/banks/oauth-credentials";

/** Régénère les clés d'intégration d'une banque (invalide les anciennes). */
export async function regenerateBankOAuthCredentials(bankId: string) {
  const { oauthClientId, oauthClientSecret } =
    await generateBankOAuthCredentials();
  return prisma.partnerBank.update({
    where: { id: bankId },
    data: { oauthClientId, oauthClientSecret },
  });
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
  password: string;
  logoFile?: File | null;
  authorizeUrl: string;
  tokenUrl: string;
  userinfoUrl: string;
  paymentUrl: string;
}) {
  const email = input.email.trim().toLowerCase();
  const code = slugCode(input.code || input.shortName);
  const password = input.password;
  const authorizeUrl = normalizeBankPageUrl("authorizeUrl", input.authorizeUrl);
  const tokenUrl = normalizeBankPageUrl("tokenUrl", input.tokenUrl);
  const userinfoUrl = normalizeBankPageUrl("userinfoUrl", input.userinfoUrl);
  const paymentUrl = normalizeBankPageUrl("paymentUrl", input.paymentUrl);

  if (!code) throw new Error("Code banque invalide");
  if (!email.includes("@")) throw new Error("E-mail invalide");
  if (password.length < 8) {
    throw new Error("Mot de passe : 8 caractères minimum");
  }

  const existing = await prisma.partnerBank.findFirst({
    where: { OR: [{ email }, { code }] },
  });
  if (existing) throw new Error("Une banque avec cet e-mail ou ce code existe déjà");

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) throw new Error("Cet e-mail est déjà utilisé par un compte");

  const hashed = await hash(password, 12);
  const now = new Date();
  const { oauthClientId, oauthClientSecret } =
    await generateBankOAuthCredentials();

  const user = await prisma.user.create({
    data: {
      name: input.name.trim(),
      email,
      emailVerified: true,
      role: "BANK",
    },
  });

  await prisma.account.create({
    data: {
      userId: user.id,
      accountId: email,
      providerId: "credential",
      password: hashed,
    },
  });

  const bank = await prisma.partnerBank.create({
    data: {
      name: input.name.trim(),
      shortName: input.shortName.trim(),
      code,
      email,
      userId: user.id,
      isActive: true,
      activatedAt: now,
      oauthClientId,
      oauthClientSecret,
      interopMode: "EXTERNAL",
      authorizeUrl,
      tokenUrl,
      userinfoUrl,
      paymentUrl,
    },
  });

  if (input.logoFile && input.logoFile.size > 0) {
    const logoUrl = await saveBankLogo(input.logoFile, bank.id);
    await prisma.partnerBank.update({
      where: { id: bank.id },
      data: { logoUrl },
    });
  }

  return prisma.partnerBank.findUniqueOrThrow({
    where: { id: bank.id },
    include: { user: { select: { id: true, email: true, role: true } } },
  });
}

export async function updatePartnerBankPages(
  bankId: string,
  input: {
    authorizeUrl: string;
    tokenUrl: string;
    userinfoUrl: string;
    paymentUrl: string;
  },
) {
  const authorizeUrl = normalizeBankPageUrl("authorizeUrl", input.authorizeUrl);
  const tokenUrl = normalizeBankPageUrl("tokenUrl", input.tokenUrl);
  const userinfoUrl = normalizeBankPageUrl("userinfoUrl", input.userinfoUrl);
  const paymentUrl = normalizeBankPageUrl("paymentUrl", input.paymentUrl);

  return prisma.partnerBank.update({
    where: { id: bankId },
    data: { authorizeUrl, tokenUrl, userinfoUrl, paymentUrl },
  });
}

/** Conservé pour les liens d'invitation déjà envoyés avant la création directe. */
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
