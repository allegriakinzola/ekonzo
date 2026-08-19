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
  console.log("Réinitialisation : conservation des comptes ADMIN / SUPER_ADMIN uniquement…\n");

  // 1. Couches financières (RESTRICT)
  const coupons = await prisma.coupon.deleteMany();
  console.log(`Coupons : ${coupons.count}`);

  const transactions = await prisma.transaction.deleteMany();
  console.log(`Transactions : ${transactions.count}`);

  const subscriptions = await prisma.subscription.deleteMany();
  console.log(`Souscriptions : ${subscriptions.count}`);

  const products = await prisma.product.deleteMany();
  console.log(`Produits (BT/OT) : ${products.count}`);

  const rates = await prisma.exchangeRate.deleteMany();
  console.log(`Taux de change : ${rates.count}`);

  // 2. Conventions signées + templates (recréés au besoin)
  const agreements = await prisma.securitiesAccountAgreement.deleteMany();
  console.log(`Conventions signées : ${agreements.count}`);

  const conventionTemplates = await prisma.securitiesAccountConvention.deleteMany();
  console.log(`Modèles de convention : ${conventionTemplates.count}`);

  // 3. Données liées aux clients
  const clients = await prisma.user.findMany({
    where: { role: { notIn: ["ADMIN", "SUPER_ADMIN"] } },
    select: { id: true, phoneNumber: true, name: true },
  });
  const clientIds = clients.map((u) => u.id);
  console.log(`\nClients à supprimer : ${clients.length}`);
  for (const u of clients) {
    console.log(`  - ${u.phoneNumber ?? u.id} (${u.name})`);
  }

  if (clientIds.length > 0) {
    await prisma.kycDraft.deleteMany({ where: { userId: { in: clientIds } } });
    await prisma.kYC.deleteMany({ where: { userId: { in: clientIds } } });
    await prisma.settlementProfile.deleteMany({ where: { userId: { in: clientIds } } });
    await prisma.notification.deleteMany({ where: { userId: { in: clientIds } } });
    await prisma.momoAccount.deleteMany({ where: { userId: { in: clientIds } } });
    await prisma.bankAccount.deleteMany({ where: { userId: { in: clientIds } } });
    await prisma.wallet.deleteMany({ where: { userId: { in: clientIds } } });
    await prisma.session.deleteMany({ where: { userId: { in: clientIds } } });
    await prisma.account.deleteMany({ where: { userId: { in: clientIds } } });
  }

  // Audit / OTP / tentatives de login (toute l'app)
  const audits = await prisma.auditLog.deleteMany();
  console.log(`\nAudit logs : ${audits.count}`);
  const verifications = await prisma.verification.deleteMany();
  console.log(`OTP / verifications : ${verifications.count}`);
  const logins = await prisma.loginAttempt.deleteMany();
  console.log(`Login attempts : ${logins.count}`);
  const drafts = await prisma.kycDraft.deleteMany();
  console.log(`KYC drafts restants : ${drafts.count}`);

  const deletedUsers = await prisma.user.deleteMany({
    where: { role: { notIn: ["ADMIN", "SUPER_ADMIN"] } },
  });
  console.log(`Utilisateurs clients supprimés : ${deletedUsers.count}`);

  // Nettoyage sessions admin optionnel — on garde le compte, on peut reset les sessions
  const admins = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
    select: { id: true, phoneNumber: true, name: true, role: true },
  });

  console.log("\nComptes conservés :");
  for (const a of admins) {
    console.log(`  ✓ ${a.phoneNumber ?? "—"} — ${a.name} [${a.role}]`);
  }

  const leftovers = {
    users: await prisma.user.count(),
    products: await prisma.product.count(),
    subscriptions: await prisma.subscription.count(),
    kyc: await prisma.kYC.count(),
  };
  console.log("\nÉtat final :", leftovers);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
