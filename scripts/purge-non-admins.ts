import { config } from "dotenv";
config({ path: ".env" });

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineTLS = false;
neonConfig.pipelineConnect = false;

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const toDelete = await prisma.user.findMany({
    where: { role: { notIn: ["ADMIN", "SUPER_ADMIN"] } },
    select: { id: true, name: true, phoneNumber: true, role: true },
  });

  console.log(`À supprimer : ${toDelete.length} utilisateur(s)`);
  for (const u of toDelete) {
    console.log(`  - ${u.phoneNumber ?? u.id} (${u.name}) [${u.role}]`);
  }

  if (toDelete.length === 0) {
    console.log("Rien à faire.");
    return;
  }

  const ids = toDelete.map((u) => u.id);

  // Ordre : enfants RESTRICT / sans cascade d'abord
  const subs = await prisma.subscription.findMany({
    where: { userId: { in: ids } },
    select: { id: true },
  });
  const subIds = subs.map((s) => s.id);

  if (subIds.length > 0) {
    await prisma.coupon.deleteMany({ where: { subscriptionId: { in: subIds } } });
    await prisma.transaction.deleteMany({
      where: { subscriptionId: { in: subIds } },
    });
    await prisma.subscription.deleteMany({ where: { id: { in: subIds } } });
    console.log(`Souscriptions supprimées : ${subIds.length}`);
  }

  await prisma.transaction.deleteMany({ where: { userId: { in: ids } } });
  await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
  await prisma.auditLog.deleteMany({ where: { userId: { in: ids } } });
  await prisma.kycDraft.deleteMany({ where: { userId: { in: ids } } });
  await prisma.kYC.deleteMany({ where: { userId: { in: ids } } });
  await prisma.settlementProfile.deleteMany({ where: { userId: { in: ids } } });
  await prisma.securitiesAccountAgreement.deleteMany({
    where: { userId: { in: ids } },
  });
  await prisma.momoAccount.deleteMany({ where: { userId: { in: ids } } });
  await prisma.bankAccount.deleteMany({ where: { userId: { in: ids } } });
  await prisma.wallet.deleteMany({ where: { userId: { in: ids } } });
  await prisma.session.deleteMany({ where: { userId: { in: ids } } });
  await prisma.account.deleteMany({ where: { userId: { in: ids } } });

  const result = await prisma.user.deleteMany({
    where: { id: { in: ids } },
  });
  console.log(`Utilisateurs supprimés : ${result.count}`);

  const remaining = await prisma.user.findMany({
    select: { phoneNumber: true, name: true, role: true },
    orderBy: { role: "asc" },
  });
  console.log("Restants :");
  for (const u of remaining) {
    console.log(`  ✓ ${u.phoneNumber ?? "—"} — ${u.name} [${u.role}]`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
