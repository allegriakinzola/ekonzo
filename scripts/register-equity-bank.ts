/**
 * Enregistre / met à jour la banque EQUITY pointant vers equity-bank.
 * Les clés OAuth sont générées automatiquement si absentes (jamais de démo).
 *
 * Usage: npx tsx scripts/register-equity-bank.ts
 */
import { config } from "dotenv";
config({ path: ".env" });
config({ path: "../equity-bank/.env" });

import { randomBytes } from "crypto";
import { hash } from "bcryptjs";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineTLS = false;
neonConfig.pipelineConnect = false;

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }),
});

function opaqueSecret(byteLength: number) {
  return randomBytes(byteLength)
    .toString("base64url")
    .replace(/=+$/, "");
}

async function generateCreds() {
  for (let i = 0; i < 8; i++) {
    const oauthClientId = `ekz_${opaqueSecret(24)}`;
    const clash = await prisma.partnerBank.findFirst({
      where: { oauthClientId },
      select: { id: true },
    });
    if (!clash) {
      return { oauthClientId, oauthClientSecret: opaqueSecret(48) };
    }
  }
  throw new Error("Impossible de générer des identifiants uniques");
}

function upsertEnv(filePath: string, updates: Record<string, string>) {
  let raw = existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
  for (const [key, value] of Object.entries(updates)) {
    const line = `${key}="${value}"`;
    const re = new RegExp(`^${key}=.*$`, "m");
    if (re.test(raw)) raw = raw.replace(re, line);
    else raw = `${raw.trimEnd()}\n${line}\n`;
  }
  writeFileSync(filePath, raw.endsWith("\n") ? raw : `${raw}\n`, "utf8");
}

async function main() {
  const equityBase = (
    process.env.EQUITY_APP_URL ??
    process.env.NEXT_PUBLIC_EQUITY_URL ??
    "http://localhost:3001"
  ).replace(/\/$/, "");

  const authorizeUrl =
    process.env.EQUITY_AUTHORIZE_URL ?? `${equityBase}/oauth/authorize`;
  const tokenUrl =
    process.env.EQUITY_TOKEN_URL ?? `${equityBase}/api/oauth/token`;
  const userinfoUrl =
    process.env.EQUITY_USERINFO_URL ?? `${equityBase}/api/oauth/userinfo`;
  const paymentUrl =
    process.env.EQUITY_PAYMENT_URL ?? `${equityBase}/payments/pay`;

  const email = (
    process.env.EQUITY_BANK_EMAIL ?? "espace@equity.cd"
  ).toLowerCase();
  const password = process.env.EQUITY_BANK_PASSWORD ?? "Equity@Bank1";
  const code = "EQUITY";

  let bank = await prisma.partnerBank.findUnique({ where: { code } });
  const creds = await generateCreds();

  // Si des clés existent déjà et qu'on ne force pas la rotation, les conserver
  const rotate = process.env.ROTATE_OAUTH === "1";
  const oauthClientId =
    !rotate && bank?.oauthClientId ? bank.oauthClientId : creds.oauthClientId;
  const oauthClientSecret =
    !rotate && bank?.oauthClientSecret
      ? bank.oauthClientSecret
      : creds.oauthClientSecret;

  if (!bank) {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    let userId = existingUser?.id;
    if (!existingUser) {
      const user = await prisma.user.create({
        data: {
          name: "Equity Bank RDC",
          email,
          emailVerified: true,
          role: "BANK",
        },
      });
      userId = user.id;
      await prisma.account.create({
        data: {
          userId: user.id,
          accountId: email,
          providerId: "credential",
          password: await hash(password, 12),
        },
      });
    }

    bank = await prisma.partnerBank.create({
      data: {
        code,
        name: "Equity Bank Congo",
        shortName: "Equity",
        email,
        userId: userId!,
        isActive: true,
        activatedAt: new Date(),
        interopMode: "EXTERNAL",
        authorizeUrl,
        tokenUrl,
        userinfoUrl,
        paymentUrl,
        oauthClientId,
        oauthClientSecret,
      },
    });
  } else {
    bank = await prisma.partnerBank.update({
      where: { id: bank.id },
      data: {
        isActive: true,
        interopMode: "EXTERNAL",
        authorizeUrl,
        tokenUrl,
        userinfoUrl,
        paymentUrl,
        oauthClientId,
        oauthClientSecret,
        activatedAt: bank.activatedAt ?? new Date(),
      },
    });
  }

  const equityEnv = resolve(process.cwd(), "../equity-bank/.env");
  upsertEnv(equityEnv, {
    EKONZO_CLIENT_ID: oauthClientId!,
    EKONZO_CLIENT_SECRET: oauthClientSecret!,
    EKONZO_BANK_CODE: "EQUITY",
    EKONZO_API_URL: process.env.EKONZO_API_URL ?? "http://localhost:3000",
  });

  console.log("✅ Banque EQUITY configurée");
  console.log(`   id           = ${bank.id}`);
  console.log(`   authorizeUrl = ${authorizeUrl}`);
  console.log(`   tokenUrl     = ${tokenUrl}`);
  console.log(`   userinfoUrl  = ${userinfoUrl}`);
  console.log(`   paymentUrl   = ${paymentUrl}`);
  console.log(`   client_id    = ${oauthClientId}`);
  console.log("   client_secret = (écrit dans equity-bank/.env)");
  console.log("Redémarrez equity-bank pour recharger .env");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
