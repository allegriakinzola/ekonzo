import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { PAID } from "@/modules/admin/stats.service";
import { ProductsManager } from "./ProductsManager";

export default async function AdminProductsPage() {
  await requireRole(["ADMIN", "SUPER_ADMIN"]);

  const [products, volumes] = await Promise.all([
    prisma.product.findMany({
      include: {
        _count: {
          select: {
            subscriptions: {
              where: { status: { notIn: ["FAILED", "CANCELLED"] } },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.subscription.groupBy({
      by: ["productId", "status"],
      where: { status: { notIn: ["FAILED", "CANCELLED"] } },
      _sum: { amount: true },
    }),
  ]);

  const paidBy = new Map<string, number>();
  const pendingBy = new Map<string, number>();
  for (const v of volumes) {
    const amount = Number(v._sum.amount ?? 0);
    const target = (PAID as readonly string[]).includes(v.status) ? paidBy : pendingBy;
    target.set(v.productId, (target.get(v.productId) ?? 0) + amount);
  }

  const serialized = products.map((p) => ({
    ...p,
    faceValue: p.faceValue.toString(),
    minTicket: p.minTicket.toString(),
    totalVolume: p.totalVolume.toString(),
    allocatedVolume: p.allocatedVolume.toString(),
    paidVolume: paidBy.get(p.id) ?? 0,
    pendingVolume: pendingBy.get(p.id) ?? 0,
    announcedRate: p.announcedRate?.toString() ?? null,
    discountRate: p.discountRate?.toString() ?? null,
    couponRate: p.couponRate?.toString() ?? null,
    issuanceDate: p.issuanceDate.toISOString(),
    maturityDate: p.maturityDate.toISOString(),
    adjudicationDate: p.adjudicationDate.toISOString(),
    subscriptionDeadline: p.subscriptionDeadline.toISOString(),
    resultsDate: p.resultsDate?.toISOString() ?? null,
    settlementDate: p.settlementDate?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  return <ProductsManager initial={serialized} />;
}
