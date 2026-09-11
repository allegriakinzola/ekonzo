import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { ProductsManager } from "./ProductsManager";

export default async function AdminProductsPage() {
  await requireRole(["ADMIN", "SUPER_ADMIN"]);

  const products = await prisma.product.findMany({
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
  });

  const serialized = products.map((p) => ({
    ...p,
    faceValue: p.faceValue.toString(),
    minTicket: p.minTicket.toString(),
    totalVolume: p.totalVolume.toString(),
    allocatedVolume: p.allocatedVolume.toString(),
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
