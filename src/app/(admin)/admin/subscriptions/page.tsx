import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { SubscriptionsManager } from "./SubscriptionsManager";

export default async function AdminSubscriptionsPage() {
  await requireRole(["ADMIN", "SUPER_ADMIN"]);

  const subs = await prisma.subscription.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, phoneNumber: true } },
      product: { select: { code: true, type: true } },
      momoAccount: { select: { operator: true, phoneNumber: true } },
      bankAccount: { select: { bankName: true, accountNumber: true } },
    },
  });

  const serialized = subs.map((s) => ({
    ...s,
    amount: s.amount.toString(),
    adjudicatedAmount: s.adjudicatedAmount?.toString() ?? null,
    adjudicatedRate: s.adjudicatedRate?.toString() ?? null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    adjudicatedAt: s.adjudicatedAt?.toISOString() ?? null,
    reimbursedAt: s.reimbursedAt?.toISOString() ?? null,
  }));

  return <SubscriptionsManager initial={serialized} />;
}
