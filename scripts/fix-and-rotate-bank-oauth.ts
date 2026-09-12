/**
 * 1) Fusionne BANK_001 → EQUITY (sessions/liens réels)
 * 2) Régénère des client_id / client_secret opaques pour chaque banque
 * 3) Met à jour equity-bank/.env pour EQUITY
 *
 * Usage: npx tsx scripts/fix-and-rotate-bank-oauth.ts
 */
import { config } from "dotenv";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { randomBytes } from "crypto";

config({ path: ".env" });

function opaqueSecret(byteLength: number) {
  return randomBytes(byteLength)
    .toString("base64url")
    .replace(/=+$/, "");
}

async function genCreds(
  prisma: PrismaClient,
  used: Set<string>,
): Promise<{ oauthClientId: string; oauthClientSecret: string }> {
  for (let i = 0; i < 8; i++) {
    const oauthClientId = `ekz_${opaqueSecret(24)}`;
    if (used.has(oauthClientId)) continue;
    const clash = await prisma.partnerBank.findFirst({
      where: { oauthClientId },
      select: { id: true },
    });
    if (!clash) {
      used.add(oauthClientId);
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
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const used = new Set<string>();

  try {
    const source = await prisma.partnerBank.findUnique({
      where: { code: "BANK_001" },
    });
    const target = await prisma.partnerBank.findUnique({
      where: { code: "EQUITY" },
    });

    if (source && target) {
      const targetCounts = await prisma.partnerBank.findUnique({
        where: { id: target.id },
        select: {
          _count: { select: { paymentSessions: true, links: true } },
        },
      });
      const targetEmpty =
        (targetCounts?._count.paymentSessions ?? 0) === 0 &&
        (targetCounts?._count.links ?? 0) === 0;

      if (targetEmpty) {
        if (!source.userId && target.userId) {
          await prisma.partnerBank.update({
            where: { id: source.id },
            data: { userId: target.userId },
          });
        }
        await prisma.partnerBank.delete({ where: { id: target.id } });
        await prisma.partnerBank.update({
          where: { id: source.id },
          data: {
            code: "EQUITY",
            shortName: "Equity",
            name: "Equity BCDC",
            authorizeUrl: source.authorizeUrl ?? target.authorizeUrl,
            tokenUrl: source.tokenUrl ?? target.tokenUrl,
            userinfoUrl: source.userinfoUrl ?? target.userinfoUrl,
          },
        });
        console.log("Merged: deleted empty EQUITY, renamed BANK_001 → EQUITY");
      } else {
        await prisma.bankPaymentSession.updateMany({
          where: { partnerBankId: source.id },
          data: { partnerBankId: target.id },
        });
        await prisma.bankLink.updateMany({
          where: { partnerBankId: source.id },
          data: { partnerBankId: target.id },
        });
        await prisma.bankCustomer.updateMany({
          where: { partnerBankId: source.id },
          data: { partnerBankId: target.id },
        });
        await prisma.partnerBank.update({
          where: { id: target.id },
          data: {
            shortName: "Equity",
            name: "Equity BCDC",
            authorizeUrl: source.authorizeUrl ?? target.authorizeUrl,
            tokenUrl: source.tokenUrl ?? target.tokenUrl,
            userinfoUrl: source.userinfoUrl ?? target.userinfoUrl,
            isActive: true,
          },
        });
        await prisma.partnerBank.delete({ where: { id: source.id } });
        console.log("Merged: moved BANK_001 data → EQUITY, deleted BANK_001");
      }
    } else if (source && !target) {
      await prisma.partnerBank.update({
        where: { id: source.id },
        data: {
          code: "EQUITY",
          shortName: "Equity",
          name: "Equity BCDC",
        },
      });
      console.log("Renamed BANK_001 → EQUITY");
    } else {
      console.log("No BANK_001 merge needed");
    }

    const banks = await prisma.partnerBank.findMany({
      select: { id: true, code: true },
      orderBy: { code: "asc" },
    });

    let equityCreds: {
      oauthClientId: string;
      oauthClientSecret: string;
    } | null = null;

    for (const bank of banks) {
      const creds = await genCreds(prisma, used);
      await prisma.partnerBank.update({
        where: { id: bank.id },
        data: creds,
      });
      console.log(`Rotated OAuth keys for ${bank.code}`);
      if (bank.code === "EQUITY") equityCreds = creds;
    }

    if (equityCreds) {
      const equityEnv = resolve(process.cwd(), "../equity-bank/.env");
      upsertEnv(equityEnv, {
        EKONZO_CLIENT_ID: equityCreds.oauthClientId,
        EKONZO_CLIENT_SECRET: equityCreds.oauthClientSecret,
        EKONZO_BANK_CODE: "EQUITY",
        EKONZO_API_URL: "http://localhost:3000",
      });
      console.log("Updated ../equity-bank/.env with EQUITY credentials");
      console.log("Restart equity-bank (npm run dev) to reload .env");
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
