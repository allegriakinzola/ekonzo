import { createHash, randomBytes } from "crypto";
import { compare, hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Currency } from "@prisma/client";
import {
  generateBankOAuthCredentials,
} from "@/modules/banks/oauth-credentials";
import { composePersonName, normalizeNamePart } from "@/lib/person-name";

const AUTH_TTL_MS = 1000 * 60 * 15;
const CODE_TTL_MS = 1000 * 60 * 5;
const TOKEN_TTL_MS = 1000 * 60 * 30;

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

function hashToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

/** Garantit client_id / client_secret sur une PartnerBank (rétrocompat) */
export async function ensureBankOAuthCredentials(bankId: string) {
  const bank = await prisma.partnerBank.findUniqueOrThrow({
    where: { id: bankId },
  });
  if (bank.oauthClientId && bank.oauthClientSecret) return bank;

  const creds = await generateBankOAuthCredentials();
  return prisma.partnerBank.update({
    where: { id: bankId },
    data: {
      oauthClientId: bank.oauthClientId ?? creds.oauthClientId,
      oauthClientSecret: bank.oauthClientSecret ?? creds.oauthClientSecret,
    },
  });
}

export function getBankAuthorizeUrl(bankCode: string, params: {
  clientId: string;
  redirectUri: string;
  state: string;
}) {
  const url = new URL(`${appUrl()}/api/v1/banks/${bankCode}/oauth/authorize`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("state", params.state);
  return url.toString();
}

export function getBankTokenUrl(bankCode: string) {
  return `${appUrl()}/api/v1/banks/${bankCode}/oauth/token`;
}

export function getBankUserinfoUrl(bankCode: string) {
  return `${appUrl()}/api/v1/banks/${bankCode}/oauth/userinfo`;
}

export async function listActivePartnerBanks() {
  return prisma.partnerBank.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      shortName: true,
      logoUrl: true,
    },
  });
}

export async function getActiveBankLink(userId: string) {
  return prisma.bankLink.findUnique({
    where: { userId },
    include: {
      partnerBank: {
        select: {
          id: true,
          code: true,
          name: true,
          shortName: true,
          logoUrl: true,
        },
      },
    },
  });
}

export async function startBankLink(userId: string, partnerBankId: string) {
  let bank = await prisma.partnerBank.findFirst({
    where: { id: partnerBankId, isActive: true },
  });
  if (!bank) throw new Error("Banque introuvable ou inactive");
  bank = await ensureBankOAuthCredentials(bank.id);

  const state = randomBytes(24).toString("hex");
  const redirectUri = `${appUrl()}/profile/bank/callback`;

  await prisma.bankOAuthSession.create({
    data: {
      partnerBankId: bank.id,
      userId,
      state,
      redirectUri,
      expiresAt: new Date(Date.now() + AUTH_TTL_MS),
    },
  });

  const authorizeUrl =
    bank.authorizeUrl
      ? (() => {
          const u = new URL(bank.authorizeUrl);
          u.searchParams.set("response_type", "code");
          u.searchParams.set("client_id", bank.oauthClientId!);
          u.searchParams.set("redirect_uri", redirectUri);
          u.searchParams.set("state", state);
          return u.toString();
        })()
      : getBankAuthorizeUrl(bank.code, {
          clientId: bank.oauthClientId!,
          redirectUri,
          state,
        });

  return { authorizeUrl, state, bank };
}

export async function completeBankLinkCallback(input: {
  userId: string;
  code: string;
  state: string;
}) {
  const session = await prisma.bankOAuthSession.findUnique({
    where: { state: input.state },
    include: { partnerBank: true },
  });

  if (!session || session.userId !== input.userId) {
    throw new Error("Session OAuth invalide");
  }
  if (session.expiresAt.getTime() < Date.now()) {
    throw new Error("Session OAuth expirée");
  }

  const bank = await ensureBankOAuthCredentials(session.partnerBank.id);

  let accessToken: string;

  if (bank.tokenUrl && bank.userinfoUrl) {
    const tokenRes = await fetch(bank.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code: input.code,
        redirect_uri: session.redirectUri,
        client_id: bank.oauthClientId,
        client_secret: bank.oauthClientSecret,
      }),
    });
    const tokenJson = (await tokenRes.json()) as {
      access_token?: string;
      error?: string;
    };
    if (!tokenRes.ok || !tokenJson.access_token) {
      throw new Error(tokenJson.error || "Échange du code impossible");
    }
    accessToken = tokenJson.access_token;

    const infoRes = await fetch(bank.userinfoUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const info = (await infoRes.json()) as {
      bankCustomerId?: string;
      nom?: string;
      postnom?: string;
      prenom?: string;
      fullName?: string;
      email?: string;
      accountNumber?: string;
      accountName?: string;
      currency?: Currency;
      error?: string;
    };
    if (!infoRes.ok || !info.bankCustomerId || !info.accountNumber) {
      throw new Error(info.error || "Profil bancaire incomplet");
    }

    const nom = normalizeNamePart(info.nom ?? "");
    const postnom = normalizeNamePart(info.postnom ?? "");
    const prenom = normalizeNamePart(info.prenom ?? "");
    const fullName =
      composePersonName({ nom, postnom, prenom }) ||
      (info.fullName ?? "").trim();

    return persistBankLink(input.userId, bank, {
      bankCustomerId: info.bankCustomerId,
      email: info.email,
      nom,
      postnom,
      prenom,
      fullName,
      accountNumber: info.accountNumber,
      accountName: info.accountName,
      currency: info.currency,
    });
  }

  // Fallback legacy (sans URLs d'intégration) — IdP hébergé ekonzo
  const token = await exchangeAuthorizationCode(bank.code, {
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: session.redirectUri,
    client_id: bank.oauthClientId!,
    client_secret: bank.oauthClientSecret!,
  });
  const info = await getUserinfoFromAccessToken(bank.code, token.access_token);
  return persistBankLink(input.userId, bank, info);
}

async function persistBankLink(
  userId: string,
  bank: {
    id: string;
    name: string;
    code: string;
    shortName: string;
    logoUrl: string | null;
  },
  info: {
    bankCustomerId: string;
    email?: string;
    nom?: string;
    postnom?: string;
    prenom?: string;
    fullName?: string;
    accountNumber: string;
    accountName?: string;
    currency?: Currency;
  },
) {
  const currency = (info.currency ?? "CDF") as Currency;
  const nom = normalizeNamePart(info.nom ?? "");
  const postnom = normalizeNamePart(info.postnom ?? "");
  const prenom = normalizeNamePart(info.prenom ?? "");
  const fullName =
    composePersonName({ nom, postnom, prenom }) || (info.fullName ?? "").trim();

  const link = await prisma.bankLink.upsert({
    where: { userId },
    create: {
      userId,
      partnerBankId: bank.id,
      bankCustomerId: info.bankCustomerId,
      customerEmail: info.email ?? "",
      fullName,
      nom,
      postnom,
      prenom,
      accountNumber: info.accountNumber,
      accountName: info.accountName ?? fullName,
      currency,
    },
    update: {
      partnerBankId: bank.id,
      bankCustomerId: info.bankCustomerId,
      customerEmail: info.email ?? "",
      fullName,
      nom,
      postnom,
      prenom,
      accountNumber: info.accountNumber,
      accountName: info.accountName ?? fullName,
      currency,
      linkedAt: new Date(),
    },
    include: {
      partnerBank: {
        select: {
          id: true,
          code: true,
          name: true,
          shortName: true,
          logoUrl: true,
        },
      },
    },
  });

  await prisma.settlementProfile.upsert({
    where: { userId },
    create: {
      userId,
      preferredChannel: "BANK_TRANSFER",
      bankName: bank.name,
      bankAccountNumber: info.accountNumber,
      bankAccountName: info.accountName ?? fullName,
    },
    update: {
      preferredChannel: "BANK_TRANSFER",
      bankName: bank.name,
      bankAccountNumber: info.accountNumber,
      bankAccountName: info.accountName ?? fullName,
    },
  });

  await prisma.bankAccount.upsert({
    where: {
      userId_accountNumber_currency: {
        userId,
        accountNumber: info.accountNumber,
        currency,
      },
    },
    create: {
      userId,
      bankName: bank.name,
      accountNumber: info.accountNumber,
      accountName: info.accountName ?? fullName,
      currency,
      channel: "SIMAD",
      isVerified: true,
      isDefault: true,
    },
    update: {
      bankName: bank.name,
      accountName: info.accountName ?? fullName,
      isVerified: true,
      isDefault: true,
    },
  });

  await prisma.bankAccount.updateMany({
    where: {
      userId,
      NOT: { accountNumber: info.accountNumber },
    },
    data: { isDefault: false },
  });

  return link;
}

// ─── IdP simulé (APIs fournies aux banques / hébergées en SIMULATED) ─────────

export async function resolveAuthorizeRequest(bankCode: string, query: {
  client_id?: string;
  redirect_uri?: string;
  state?: string;
  response_type?: string;
}) {
  let bank = await prisma.partnerBank.findFirst({
    where: { code: bankCode.toUpperCase(), isActive: true },
  });
  if (!bank) throw new Error("Banque introuvable");
  bank = await ensureBankOAuthCredentials(bank.id);
  if (query.response_type !== "code") throw new Error("response_type invalide");
  if (!query.client_id || query.client_id !== bank.oauthClientId) {
    throw new Error("client_id invalide");
  }
  if (!query.redirect_uri || !query.state) {
    throw new Error("redirect_uri et state requis");
  }

  const session = await prisma.bankOAuthSession.findUnique({
    where: { state: query.state },
  });
  if (!session || session.partnerBankId !== bank.id) {
    throw new Error("state invalide");
  }
  if (session.redirectUri !== query.redirect_uri) {
    throw new Error("redirect_uri ne correspond pas");
  }
  if (session.expiresAt.getTime() < Date.now()) {
    throw new Error("Demande expirée");
  }

  return { bank, session };
}

export async function authenticateBankCustomerAndIssueCode(input: {
  bankCode: string;
  state: string;
  email: string;
  password: string;
}) {
  const bank = await prisma.partnerBank.findFirst({
    where: { code: input.bankCode.toUpperCase(), isActive: true },
  });
  if (!bank) throw new Error("Banque introuvable");

  const session = await prisma.bankOAuthSession.findUnique({
    where: { state: input.state },
  });
  if (!session || session.partnerBankId !== bank.id) {
    throw new Error("Session invalide");
  }
  if (session.expiresAt.getTime() < Date.now()) {
    throw new Error("Session expirée");
  }

  const customer = await prisma.bankCustomer.findUnique({
    where: {
      partnerBankId_email: {
        partnerBankId: bank.id,
        email: input.email.trim().toLowerCase(),
      },
    },
  });
  if (!customer || !customer.isActive) {
    throw new Error("Identifiants bancaires incorrects");
  }

  const ok = await compare(input.password, customer.passwordHash);
  if (!ok) throw new Error("Identifiants bancaires incorrects");

  const rawCode = randomBytes(24).toString("hex");
  await prisma.bankOAuthSession.update({
    where: { id: session.id },
    data: {
      code: hashToken(rawCode),
      codeExpiresAt: new Date(Date.now() + CODE_TTL_MS),
      bankCustomerId: customer.id,
    },
  });

  const redirect = new URL(session.redirectUri);
  redirect.searchParams.set("code", rawCode);
  redirect.searchParams.set("state", session.state);
  return { redirectUrl: redirect.toString(), customer };
}

export async function exchangeAuthorizationCode(bankCode: string, body: {
  grant_type?: string;
  code?: string;
  redirect_uri?: string;
  client_id?: string;
  client_secret?: string;
}) {
  if (body.grant_type !== "authorization_code") {
    throw new Error("grant_type invalide");
  }
  if (!body.code || !body.redirect_uri || !body.client_id || !body.client_secret) {
    throw new Error("Paramètres manquants");
  }

  const bank = await prisma.partnerBank.findFirst({
    where: { code: bankCode.toUpperCase(), isActive: true },
  });
  if (!bank) throw new Error("Banque introuvable");
  const ensured = await ensureBankOAuthCredentials(bank.id);
  if (
    body.client_id !== ensured.oauthClientId ||
    body.client_secret !== ensured.oauthClientSecret
  ) {
    throw new Error("Client OAuth invalide");
  }

  const codeHash = hashToken(body.code);
  const session = await prisma.bankOAuthSession.findFirst({
    where: { code: codeHash, partnerBankId: ensured.id },
  });
  if (!session || !session.codeExpiresAt || !session.bankCustomerId) {
    throw new Error("Code invalide");
  }
  if (session.consumedAt) throw new Error("Code déjà utilisé");
  if (session.codeExpiresAt.getTime() < Date.now()) {
    throw new Error("Code expiré");
  }
  if (session.redirectUri !== body.redirect_uri) {
    throw new Error("redirect_uri invalide");
  }

  const rawToken = randomBytes(32).toString("hex");
  await prisma.bankOAuthSession.update({
    where: { id: session.id },
    data: {
      consumedAt: new Date(),
      accessToken: hashToken(rawToken),
      tokenExpiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });

  return {
    access_token: rawToken,
    token_type: "Bearer",
    expires_in: Math.floor(TOKEN_TTL_MS / 1000),
  };
}

export async function getUserinfoFromAccessToken(
  bankCode: string,
  accessToken: string,
) {
  const bank = await prisma.partnerBank.findFirst({
    where: { code: bankCode.toUpperCase(), isActive: true },
  });
  if (!bank) throw new Error("Banque introuvable");

  const session = await prisma.bankOAuthSession.findFirst({
    where: {
      partnerBankId: bank.id,
      accessToken: hashToken(accessToken),
    },
  });
  if (!session?.bankCustomerId || !session.tokenExpiresAt) {
    throw new Error("Token invalide");
  }
  if (session.tokenExpiresAt.getTime() < Date.now()) {
    throw new Error("Token expiré");
  }

  const customer = await prisma.bankCustomer.findUnique({
    where: { id: session.bankCustomerId },
  });
  if (!customer || !customer.isActive) {
    throw new Error("Client bancaire introuvable");
  }

  return {
    bankCustomerId: customer.id,
    email: customer.email,
    nom: customer.nom,
    postnom: customer.postnom,
    prenom: customer.prenom,
    fullName: customer.fullName,
    accountNumber: customer.accountNumber,
    accountName: customer.accountName,
    currency: customer.currency,
  };
}

// ─── CRUD clients bancaires (espace banque) ──────────────────────────────────

export async function getPartnerBankForStaffUser(userId: string) {
  return prisma.partnerBank.findUnique({ where: { userId } });
}

export async function listBankCustomers(partnerBankId: string) {
  return prisma.bankCustomer.findMany({
    where: { partnerBankId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      fullName: true,
      nom: true,
      postnom: true,
      prenom: true,
      accountNumber: true,
      accountName: true,
      currency: true,
      isActive: true,
      createdAt: true,
    },
  });
}

export async function createBankCustomer(input: {
  partnerBankId: string;
  email: string;
  password: string;
  nom: string;
  postnom?: string;
  prenom: string;
  accountNumber: string;
  accountName: string;
  currency: Currency;
}) {
  const email = input.email.trim().toLowerCase();
  if (!email.includes("@")) throw new Error("E-mail invalide");
  if (input.password.length < 8) {
    throw new Error("Mot de passe : 8 caractères minimum");
  }
  const nom = normalizeNamePart(input.nom);
  const postnom = normalizeNamePart(input.postnom ?? "");
  const prenom = normalizeNamePart(input.prenom);
  if (!nom || !prenom) throw new Error("Nom et prénom requis");
  const fullName = composePersonName({ nom, postnom, prenom });

  return prisma.bankCustomer.create({
    data: {
      partnerBankId: input.partnerBankId,
      email,
      passwordHash: await hash(input.password, 12),
      fullName,
      nom,
      postnom,
      prenom,
      accountNumber: input.accountNumber.trim(),
      accountName: input.accountName.trim() || fullName,
      currency: input.currency,
    },
  });
}

export async function updateBankCustomer(
  partnerBankId: string,
  customerId: string,
  data: {
    fullName?: string;
    accountNumber?: string;
    accountName?: string;
    currency?: Currency;
    isActive?: boolean;
    password?: string;
  },
) {
  const existing = await prisma.bankCustomer.findFirst({
    where: { id: customerId, partnerBankId },
  });
  if (!existing) throw new Error("Client introuvable");

  return prisma.bankCustomer.update({
    where: { id: customerId },
    data: {
      ...(data.fullName ? { fullName: data.fullName.trim() } : {}),
      ...(data.accountNumber
        ? { accountNumber: data.accountNumber.trim() }
        : {}),
      ...(data.accountName ? { accountName: data.accountName.trim() } : {}),
      ...(data.currency ? { currency: data.currency } : {}),
      ...(typeof data.isActive === "boolean" ? { isActive: data.isActive } : {}),
      ...(data.password && data.password.length >= 8
        ? { passwordHash: await hash(data.password, 12) }
        : {}),
    },
  });
}

export async function deleteBankCustomer(
  partnerBankId: string,
  customerId: string,
) {
  const existing = await prisma.bankCustomer.findFirst({
    where: { id: customerId, partnerBankId },
  });
  if (!existing) throw new Error("Client introuvable");
  await prisma.bankCustomer.delete({ where: { id: customerId } });
}
