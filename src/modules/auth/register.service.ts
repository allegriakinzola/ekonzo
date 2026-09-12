import { createHash, randomInt } from "crypto";
import { hash as bcryptHash, compare as bcryptCompare } from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { sendOtpEmail } from "@/lib/mailer";
import { composePersonName, normalizeNamePart } from "@/lib/person-name";

const OTP_TTL_MS = 5 * 60 * 1000;
const PENDING_PREFIX = "register:";
const MAX_ATTEMPTS = 5;

type PendingPayload = {
  nom: string;
  postnom: string;
  prenom: string;
  name: string;
  passwordHash: string;
  otpHash: string;
  attempts: number;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function pendingId(email: string) {
  return `${PENDING_PREFIX}${email}`;
}

function hashOtp(otp: string) {
  return createHash("sha256").update(otp).digest("hex");
}

function generateOtp() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

async function deletePending(email: string) {
  await prisma.verification.deleteMany({
    where: { identifier: pendingId(email) },
  });
}

/**
 * Supprime un compte investisseur non vérifié (inscription abandonnée avant OTP).
 */
export async function purgeUnverifiedClient(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      role: true,
      emailVerified: true,
      bankLink: { select: { id: true } },
      _count: { select: { subscriptions: true } },
    },
  });
  if (!user) return;
  if (user.role !== "CLIENT" || user.emailVerified) return;
  if (user._count.subscriptions > 0 || user.bankLink) return;

  await prisma.user.delete({ where: { id: user.id } });
}

/** Nettoyage des inscriptions CLIENT abandonnées (email non vérifié). */
export async function purgeStaleUnverifiedClients() {
  const stale = await prisma.user.findMany({
    where: {
      role: "CLIENT",
      emailVerified: false,
      subscriptions: { none: {} },
      bankLink: null,
    },
    select: { id: true },
  });
  if (stale.length === 0) return 0;
  await prisma.user.deleteMany({
    where: { id: { in: stale.map((u) => u.id) } },
  });
  return stale.length;
}

export async function startRegistration(input: {
  nom: string;
  postnom?: string;
  prenom: string;
  email: string;
  password: string;
}) {
  const email = normalizeEmail(input.email);
  const nom = normalizeNamePart(input.nom);
  const postnom = normalizeNamePart(input.postnom ?? "");
  const prenom = normalizeNamePart(input.prenom);
  const name = composePersonName({ nom, postnom, prenom });

  if (nom.length < 1) throw new Error("Nom requis");
  if (prenom.length < 1) throw new Error("Prénom requis");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("E-mail invalide");
  }
  if (input.password.length < 8) {
    throw new Error("Le mot de passe doit contenir au moins 8 caractères");
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, emailVerified: true },
  });

  if (existing?.emailVerified) {
    throw new Error("Un compte existe déjà avec cet e-mail. Connectez-vous.");
  }
  if (existing && existing.role !== "CLIENT") {
    throw new Error("Cet e-mail est déjà utilisé.");
  }
  if (existing && !existing.emailVerified) {
    await purgeUnverifiedClient(email);
  }

  const otp = generateOtp();
  const passwordHash = await bcryptHash(input.password, 12);
  const payload: PendingPayload = {
    nom,
    postnom,
    prenom,
    name,
    passwordHash,
    otpHash: hashOtp(otp),
    attempts: 0,
  };

  await deletePending(email);
  await prisma.verification.create({
    data: {
      identifier: pendingId(email),
      value: JSON.stringify(payload),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });

  console.log(`[OTP EMAIL] → ${email} (register) : ${otp}`);
  await sendOtpEmail(email, otp);

  return { email };
}

export async function resendRegistrationOtp(emailRaw: string) {
  const email = normalizeEmail(emailRaw);
  const row = await prisma.verification.findFirst({
    where: { identifier: pendingId(email) },
    orderBy: { createdAt: "desc" },
  });
  if (!row || row.expiresAt < new Date()) {
    throw new Error("Inscription expirée. Recommencez depuis le formulaire.");
  }

  let payload: PendingPayload;
  try {
    payload = JSON.parse(row.value) as PendingPayload;
  } catch {
    throw new Error("Inscription invalide. Recommencez.");
  }

  const otp = generateOtp();
  payload.otpHash = hashOtp(otp);
  payload.attempts = 0;

  await prisma.verification.update({
    where: { id: row.id },
    data: {
      value: JSON.stringify(payload),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });

  console.log(`[OTP EMAIL] → ${email} (register-resend) : ${otp}`);
  await sendOtpEmail(email, otp);
  return { email };
}

/** Confirme l'OTP et crée le compte investisseur (emailVerified = true). */
export async function confirmRegistration(input: {
  email: string;
  otp: string;
  password: string;
}) {
  const email = normalizeEmail(input.email);
  const otp = input.otp.trim();

  if (!/^\d{6}$/.test(otp)) throw new Error("Code à 6 chiffres requis");

  const row = await prisma.verification.findFirst({
    where: { identifier: pendingId(email) },
    orderBy: { createdAt: "desc" },
  });
  if (!row) {
    throw new Error("Aucune inscription en cours pour cet e-mail.");
  }
  if (row.expiresAt < new Date()) {
    await deletePending(email);
    throw new Error("Code expiré. Demandez un nouveau code.");
  }

  let payload: PendingPayload;
  try {
    payload = JSON.parse(row.value) as PendingPayload;
  } catch {
    await deletePending(email);
    throw new Error("Inscription invalide. Recommencez.");
  }

  if (payload.attempts >= MAX_ATTEMPTS) {
    await deletePending(email);
    throw new Error("Trop de tentatives. Recommencez l'inscription.");
  }

  if (payload.otpHash !== hashOtp(otp)) {
    payload.attempts += 1;
    await prisma.verification.update({
      where: { id: row.id },
      data: { value: JSON.stringify(payload) },
    });
    throw new Error("Code invalide.");
  }

  const passwordOk = await bcryptCompare(input.password, payload.passwordHash);
  if (!passwordOk) {
    throw new Error("Session d'inscription invalide. Recommencez.");
  }

  const race = await prisma.user.findUnique({ where: { email } });
  if (race?.emailVerified) {
    await deletePending(email);
    throw new Error("Un compte existe déjà avec cet e-mail. Connectez-vous.");
  }
  if (race && !race.emailVerified) {
    await purgeUnverifiedClient(email);
  }

  const user = await prisma.user.create({
    data: {
      name: payload.name,
      nom: payload.nom,
      postnom: payload.postnom ?? "",
      prenom: payload.prenom,
      email,
      emailVerified: true,
      role: "CLIENT",
      accounts: {
        create: {
          accountId: email,
          providerId: "credential",
          password: payload.passwordHash,
        },
      },
    },
  });

  await deletePending(email);

  return {
    userId: user.id,
    email,
    name: user.name,
    nom: user.nom,
    postnom: user.postnom,
    prenom: user.prenom,
  };
}
