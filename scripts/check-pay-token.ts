/**
 * Diagnostic: does a raw pay token exist in BankPaymentSession?
 * Usage: npx tsx scripts/check-pay-token.ts <rawToken> [rawToken2...]
 */
import { config } from "dotenv";
import { createHash } from "crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

config({ path: ".env" });

async function main() {
  const tokens = process.argv.slice(2);
  if (tokens.length === 0) {
    console.error("Usage: npx tsx scripts/check-pay-token.ts <token>...");
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const count = await prisma.bankPaymentSession.count();
    console.log("totalSessions=", count);

    for (const t of tokens) {
      const h = createHash("sha256").update(t).digest("hex");
      const s = await prisma.bankPaymentSession.findFirst({
        where: { token: h },
        select: {
          status: true,
          expiresAt: true,
          createdAt: true,
          partnerBank: { select: { code: true } },
        },
      });
      if (!s) {
        console.log(t.slice(0, 8) + "…", "MISSING");
        continue;
      }
      console.log(
        t.slice(0, 8) + "…",
        "FOUND",
        "bank=" + s.partnerBank.code,
        "status=" + s.status,
        "expired=" + (s.expiresAt < new Date()),
        "created=" + s.createdAt.toISOString(),
      );
    }

    const latest = await prisma.bankPaymentSession.findMany({
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        status: true,
        createdAt: true,
        expiresAt: true,
        partnerBank: { select: { code: true } },
      },
    });
    console.log(
      "latest=",
      latest.map((s) => ({
        bank: s.partnerBank.code,
        status: s.status,
        created: s.createdAt.toISOString(),
        expired: s.expiresAt < new Date(),
      })),
    );
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
