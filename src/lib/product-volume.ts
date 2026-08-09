import { prisma } from "@/lib/prisma";

/** Montant déjà engagé (souscriptions actives) sur un ou plusieurs produits. */
export async function getCommittedVolumes(productIds: string[]) {
  if (productIds.length === 0) return new Map<string, number>();

  const rows = await prisma.subscription.groupBy({
    by: ["productId"],
    where: {
      productId: { in: productIds },
      status: { notIn: ["CANCELLED", "FAILED"] },
    },
    _sum: { amount: true },
  });

  return new Map(
    rows.map((r) => [r.productId, Number(r._sum.amount ?? 0)]),
  );
}

export function volumeLeft(totalVolume: number | string, committed: number) {
  return Math.max(0, Number(totalVolume) - committed);
}
