import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

config({ path: ".env" });

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    const banks = await prisma.partnerBank.findMany({
      select: {
        code: true,
        shortName: true,
        oauthClientId: true,
        authorizeUrl: true,
        isActive: true,
        _count: { select: { paymentSessions: true, links: true } },
      },
      orderBy: { code: "asc" },
    });
    console.log(JSON.stringify(banks, null, 2));
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
