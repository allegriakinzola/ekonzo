/**
 * Purge totale sauf l'admin principal (SEED_ADMIN_EMAIL / admin@ekonzo.cd).
 * Usage: npx tsx scripts/reset-app-keep-admin.ts
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

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }),
});

const KEEP_EMAIL = (
  process.env.SEED_ADMIN_EMAIL ?? "admin@ekonzo.cd"
).toLowerCase();

async function main() {
  const admin = await prisma.user.findUnique({ where: { email: KEEP_EMAIL } });
  if (!admin) {
    throw new Error(
      `Admin principal introuvable (${KEEP_EMAIL}). Abandon — aucune suppression.`,
    );
  }

  console.log(`Conservation : ${admin.email} [${admin.role}] (${admin.id})\n`);

  // ── Banques / interop (enfants d'abord) ──────────────────────────────
  const paymentSessions = await prisma.bankPaymentSession.deleteMany();
  console.log(`BankPaymentSession : ${paymentSessions.count}`);

  const oauthSessions = await prisma.bankOAuthSession.deleteMany();
  console.log(`BankOAuthSession : ${oauthSessions.count}`);

  const bankLinks = await prisma.bankLink.deleteMany();
  console.log(`BankLink : ${bankLinks.count}`);

  const bankCustomers = await prisma.bankCustomer.deleteMany();
  console.log(`BankCustomer : ${bankCustomers.count}`);

  const bankInvites = await prisma.bankInviteToken.deleteMany();
  console.log(`BankInviteToken : ${bankInvites.count}`);

  // Détacher userId avant suppression des banques (évite FK user)
  await prisma.partnerBank.updateMany({ data: { userId: null } });
  const banks = await prisma.partnerBank.deleteMany();
  console.log(`PartnerBank : ${banks.count}`);

  // ── Couches financières ──────────────────────────────────────────────
  const coupons = await prisma.coupon.deleteMany();
  console.log(`Coupon : ${coupons.count}`);

  const transactions = await prisma.transaction.deleteMany();
  console.log(`Transaction : ${transactions.count}`);

  const subscriptions = await prisma.subscription.deleteMany();
  console.log(`Subscription : ${subscriptions.count}`);

  const products = await prisma.product.deleteMany();
  console.log(`Product : ${products.count}`);

  const rates = await prisma.exchangeRate.deleteMany();
  console.log(`ExchangeRate : ${rates.count}`);

  // ── Profils / comptes / auth secondaires ───────────────────────────
  const settlements = await prisma.settlementProfile.deleteMany();
  console.log(`SettlementProfile : ${settlements.count}`);

  const notifications = await prisma.notification.deleteMany();
  console.log(`Notification : ${notifications.count}`);

  const momo = await prisma.momoAccount.deleteMany();
  console.log(`MomoAccount : ${momo.count}`);

  const bankAccounts = await prisma.bankAccount.deleteMany();
  console.log(`BankAccount : ${bankAccounts.count}`);

  const wallets = await prisma.wallet.deleteMany();
  console.log(`Wallet : ${wallets.count}`);

  const audits = await prisma.auditLog.deleteMany();
  console.log(`AuditLog : ${audits.count}`);

  const verifications = await prisma.verification.deleteMany();
  console.log(`Verification : ${verifications.count}`);

  const logins = await prisma.loginAttempt.deleteMany();
  console.log(`LoginAttempt : ${logins.count}`);

  // ── Tous les users sauf l'admin principal ────────────────────────────
  const others = await prisma.user.findMany({
    where: { id: { not: admin.id } },
    select: { id: true, email: true, role: true, name: true },
  });
  console.log(`\nUtilisateurs à supprimer : ${others.length}`);
  for (const u of others) {
    console.log(`  - ${u.email} [${u.role}] ${u.name}`);
  }

  if (others.length > 0) {
    const ids = others.map((u) => u.id);
    await prisma.session.deleteMany({ where: { userId: { in: ids } } });
    await prisma.account.deleteMany({ where: { userId: { in: ids } } });
    const deleted = await prisma.user.deleteMany({ where: { id: { in: ids } } });
    console.log(`Utilisateurs supprimés : ${deleted.count}`);
  }

  // Sessions admin : on peut les garder ; optionnel reset
  const leftovers = {
    users: await prisma.user.findMany({
      select: { email: true, role: true, name: true },
    }),
    products: await prisma.product.count(),
    subscriptions: await prisma.subscription.count(),
    banks: await prisma.partnerBank.count(),
    paymentSessions: await prisma.bankPaymentSession.count(),
  };

  console.log("\nÉtat final :");
  console.log(`  users = ${leftovers.users.length}`);
  for (const u of leftovers.users) {
    console.log(`    ✓ ${u.email} — ${u.name} [${u.role}]`);
  }
  console.log(`  products = ${leftovers.products}`);
  console.log(`  subscriptions = ${leftovers.subscriptions}`);
  console.log(`  banks = ${leftovers.banks}`);
  console.log(`  paymentSessions = ${leftovers.paymentSessions}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
