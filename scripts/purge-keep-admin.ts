/**
 * Supprime tous les utilisateurs et données métier, conserve ADMIN / SUPER_ADMIN.
 * Usage: npx tsx scripts/purge-keep-admin.ts
 */
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
  const admins = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
    select: { id: true, phoneNumber: true, email: true, role: true, name: true },
  });

  if (admins.length === 0) {
    throw new Error("Aucun ADMIN trouvé — abort. Lance d’abord: npx prisma db seed");
  }

  const adminIds = admins.map((a) => a.id);
  console.log("Admins conservés:", admins);

  // Ordre: tables sans cascade / FK vers user
  const coupons = await prisma.coupon.deleteMany();
  const transactions = await prisma.transaction.deleteMany();
  const subscriptions = await prisma.subscription.deleteMany();
  const products = await prisma.product.deleteMany();
  const rates = await prisma.exchangeRate.deleteMany();
  const verifications = await prisma.verification.deleteMany();
  const loginAttempts = await prisma.loginAttempt.deleteMany();
  const auditLogs = await prisma.auditLog.deleteMany();

  const deletedUsers = await prisma.user.deleteMany({
    where: { id: { notIn: adminIds } },
  });

  // Nettoyer sessions orphelines éventuelles côté admin (optionnel: garder)
  // Rien d’autre

  const remaining = await prisma.user.findMany({
    select: { id: true, phoneNumber: true, role: true, name: true },
  });

  console.log("Supprimé:", {
    coupons: coupons.count,
    transactions: transactions.count,
    subscriptions: subscriptions.count,
    products: products.count,
    exchangeRates: rates.count,
    verifications: verifications.count,
    loginAttempts: loginAttempts.count,
    auditLogs: auditLogs.count,
    users: deletedUsers.count,
  });
  console.log("Utilisateurs restants:", remaining);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
