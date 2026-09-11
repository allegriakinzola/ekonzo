import { createHash, randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/mailer";

const INVITE_TTL_MS = 1000 * 60 * 60 * 48; // 48h

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

export async function saveBankLogo(file: File, bankId: string) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
  const safeExt = ["png", "jpg", "jpeg", "webp", "svg"].includes(ext) ? ext : "png";
  const dir = path.join(process.cwd(), "public", "uploads", "banks");
  await mkdir(dir, { recursive: true });
  const filename = `${bankId}.${safeExt}`;
  await writeFile(path.join(dir, filename), bytes);
  return `/uploads/banks/${filename}`;
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
