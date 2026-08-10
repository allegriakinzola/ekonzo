import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ListBulletsIcon } from "@phosphor-icons/react/dist/ssr";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatAmount, formatDate, daysUntil } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import {
  getCommittedVolumes,
  volumeLeft as calcVolumeLeft,
} from "@/lib/product-volume";
import {
  getUserKycStatus,
  hasSignedConvention,
  requireRole,
} from "@/lib/session";
import { getSettlementProfile } from "@/modules/settlement/settlement.service";
import { cn } from "@/lib/utils";
import { SubscribeForm } from "./SubscribeForm";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireRole("CLIENT");

  const [kycStatus, conventionSigned, p, accountUser, settlement] =
    await Promise.all([
      getUserKycStatus(session.user.id),
      hasSignedConvention(session.user.id),
      prisma.product.findUnique({ where: { id } }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { phoneNumber: true },
      }),
      getSettlementProfile(session.user.id),
    ]);

  if (!conventionSigned) {
    redirect("/convention");
  }
  if (kycStatus !== "VERIFIED") {
    redirect("/kyc");
  }
  if (!p || p.status !== "OPEN") notFound();

  const committedMap = await getCommittedVolumes([p.id]);
  const committed = committedMap.get(p.id) ?? 0;
  const days = daysUntil(p.subscriptionDeadline);
  const rate = p.discountRate;
  const rateLabel = "Taux d'escompte";
  const volumeLeft = calcVolumeLeft(p.totalVolume.toString(), committed);
  const pct = Math.round(
    (committed / Number(p.totalVolume)) * 100,
  );

  const productForForm = {
    id: p.id,
    type: p.type,
    currency: p.currency,
    minTicket: p.minTicket.toString(),
    volumeLeft: volumeLeft.toString(),
    discountRate: p.discountRate?.toString() ?? null,
    couponRate: p.couponRate?.toString() ?? null,
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button variant="link" size="sm" className="h-auto p-0" render={<Link href="/products" />}>
          Produits
        </Button>
        <span>/</span>
        <span className="font-medium text-foreground">{p.code}</span>
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-2 text-primary">
          <ListBulletsIcon className="size-5" weight="duotone" />
          <span className="text-xs font-medium uppercase tracking-wide">
            Souscription
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-rdc-navy">
          {p.code}
        </h1>
        <p className="text-sm text-muted-foreground">
          Émis le {formatDate(p.issuanceDate)} · Maturité le{" "}
          {formatDate(p.maturityDate)}
        </p>
      </div>

      <Card className="ring-1 ring-rdc-navy/5">
        <CardHeader className="border-b [.border-b]:pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <Badge
                variant="outline"
                className="border-primary/20 bg-primary/10 text-primary"
              >
                Bon du Trésor
              </Badge>
              <CardTitle className="text-lg">{p.code}</CardTitle>
              <CardDescription>
                Émis le {formatDate(p.issuanceDate)} · Maturité le{" "}
                {formatDate(p.maturityDate)}
              </CardDescription>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-primary">
                {rate ? `${(Number(rate) * 100).toFixed(2)} %` : "—"}
              </p>
              <p className="text-xs text-muted-foreground">{rateLabel}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <DetailStat
              label="Montant total annoncé"
              value={formatAmount(p.totalVolume.toString(), p.currency)}
            />
            <DetailStat
              label="Ticket minimum"
              value={formatAmount(p.minTicket.toString(), p.currency)}
            />
            <DetailStat
              label="Disponible"
              value={formatAmount(volumeLeft.toString(), p.currency)}
            />
            <DetailStat label="Devise" value={p.currency} />
            <DetailStat
              label="Date adjudication"
              value={formatDate(p.adjudicationDate)}
            />
            <DetailStat
              label="Clôture souscription"
              value={formatDate(p.subscriptionDeadline)}
            />
            <DetailStat
              label="Délai restant"
              value={`${days} jour${days > 1 ? "s" : ""}`}
              highlight={days <= 3}
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Allocation</span>
              <span className="text-xs font-medium">{pct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <SubscribeForm
        product={productForForm}
        accountPhone={accountUser?.phoneNumber ?? ""}
        settlement={settlement}
      />
    </div>
  );
}

function DetailStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/50 px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-sm font-semibold",
          highlight && "text-destructive",
        )}
      >
        {value}
      </p>
    </div>
  );
}
