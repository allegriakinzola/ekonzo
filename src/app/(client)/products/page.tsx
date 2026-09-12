import Link from "next/link";
import { ListBulletsIcon, StackIcon } from "@phosphor-icons/react/dist/ssr";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
import { EmissionCard } from "@/components/EmissionCard";

export default async function ProductsPage() {
  await requireRole("CLIENT");

  const products = await prisma.product.findMany({
    where: { status: "OPEN" },
    orderBy: { subscriptionDeadline: "asc" },
    select: {
      id: true,
      code: true,
      type: true,
      instrumentType: true,
      currency: true,
      lineLabel: true,
      announcedRate: true,
      discountRate: true,
      couponRate: true,
      subscriptionDeadline: true,
    },
  });

  const btCount = products.filter((p) => p.type === "BT").length;
  const otCount = products.length - btCount;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Marché primaire"
        icon={<ListBulletsIcon className="size-4" weight="duotone" />}
        title="Émissions ouvertes"
        description="Sélectionnez une émission pour consulter le détail et souscrire."
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="h-7 gap-1.5 px-2.5">
              <StackIcon className="size-3.5" weight="duotone" />
              {products.length} émission{products.length > 1 ? "s" : ""}
            </Badge>
            {btCount > 0 && (
              <Badge
                variant="outline"
                className="h-7 border-primary/20 bg-primary/5 px-2.5 text-primary"
              >
                {btCount} BT
              </Badge>
            )}
            {otCount > 0 && (
              <Badge
                variant="outline"
                className="h-7 border-rdc-navy/20 bg-rdc-navy/5 px-2.5 text-rdc-navy"
              >
                {otCount} OT
              </Badge>
            )}
          </div>
        }
      />

      {products.length === 0 ? (
        <Card className="ring-1 ring-rdc-navy/5">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <StackIcon className="size-6" weight="duotone" />
            </div>
            <p className="text-base font-semibold text-rdc-navy">
              Aucune émission ouverte pour le moment
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Les prochaines annonces d&apos;adjudication apparaîtront ici.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {products.map((p) => (
            <EmissionCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
