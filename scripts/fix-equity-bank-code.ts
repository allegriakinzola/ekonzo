/**
 * Fusionne BANK_001 (sessions/liens réels) vers le code EQUITY attendu
 * par equity-bank (EKONZO_BANK_CODE=EQUITY).
 *
 * Usage: npx tsx scripts/fix-equity-bank-code.ts
 */
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

config({ path: ".env" });

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const source = await prisma.partnerBank.findUnique({
      where: { code: "BANK_001" },
    });
    const target = await prisma.partnerBank.findUnique({
      where: { code: "EQUITY" },
    });

    if (!source) {
      console.log("BANK_001 introuvable — rien à faire.");
      if (target) console.log("EQUITY existe déjà.");
      return;
    }

    if (!target) {
      await prisma.partnerBank.update({
        where: { id: source.id },
        data: {
          code: "EQUITY",
          shortName: "Equity",
          name: source.name.includes("Equity")
            ? source.name
            : "Equity BCDC",
        },
      });
      console.log("BANK_001 renommé en EQUITY.");
      return;
    }

    // EQUITY vide (ou cible) : déplacer les données puis supprimer le doublon source
    const targetCounts = await prisma.partnerBank.findUnique({
      where: { id: target.id },
      select: {
        _count: { select: { paymentSessions: true, links: true } },
      },
    });

    if (
      (targetCounts?._count.paymentSessions ?? 0) > 0 ||
      (targetCounts?._count.links ?? 0) > 0
    ) {
      // Déplacer vers EQUITY si source a les données
      await prisma.bankPaymentSession.updateMany({
        where: { partnerBankId: source.id },
        data: { partnerBankId: target.id },
      });
      await prisma.bankLink.updateMany({
        where: { partnerBankId: source.id },
        data: { partnerBankId: target.id },
      });
    } else {
      // Cible vide : préférer garder l'id source (plus de données) en renommant
      // → supprimer cible vide, renommer source
      if (target.userId && target.userId !== source.userId) {
        // garder le user EQUITY si source n'en a pas
        if (!source.userId) {
          await prisma.partnerBank.update({
            where: { id: source.id },
            data: { userId: target.userId },
          });
        }
      }
      await prisma.partnerBank.delete({ where: { id: target.id } });
      await prisma.partnerBank.update({
        where: { id: source.id },
        data: {
          code: "EQUITY",
          shortName: "Equity",
          name: "Equity BCDC",
          oauthClientId:
            source.oauthClientId ?? target.oauthClientId ?? undefined,
          oauthClientSecret:
            source.oauthClientSecret ??
            target.oauthClientSecret ??
            undefined,
          authorizeUrl: source.authorizeUrl ?? target.authorizeUrl,
          tokenUrl: source.tokenUrl ?? target.tokenUrl,
          userinfoUrl: source.userinfoUrl ?? target.userinfoUrl,
        },
      });
      console.log("Doublon EQUITY vide supprimé ; BANK_001 → EQUITY.");
      return;
    }

    // Align credentials on target then delete source
    await prisma.partnerBank.update({
      where: { id: target.id },
      data: {
        shortName: "Equity",
        name: "Equity BCDC",
        oauthClientId: source.oauthClientId ?? target.oauthClientId,
        oauthClientSecret:
          source.oauthClientSecret ?? target.oauthClientSecret,
        authorizeUrl: source.authorizeUrl ?? target.authorizeUrl,
        tokenUrl: source.tokenUrl ?? target.tokenUrl,
        userinfoUrl: source.userinfoUrl ?? target.userinfoUrl,
        isActive: true,
      },
    });

    // Move remaining related rows if any
    await prisma.bankCustomer.updateMany({
      where: { partnerBankId: source.id },
      data: { partnerBankId: target.id },
    }).catch(() => undefined);

    await prisma.partnerBank.delete({ where: { id: source.id } });
    console.log("Sessions/liens migrés de BANK_001 → EQUITY ; BANK_001 supprimé.");
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
