import Link from "next/link";
import {
  ArrowRightIcon,
  CalendarBlankIcon,
  ClockIcon,
  ListBulletsIcon,
  StackIcon,
} from "@phosphor-icons/react/dist/ssr";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { formatAmount, formatDate, daysUntil } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import {
  getCommittedVolumes,
  volumeLeft as calcVolumeLeft,
} from "@/lib/product-volume";
import { requireRole } from "@/lib/session";
import { cn } from "@/lib/utils";
import {
  INSTRUMENT_SHORT,
  faceValueFromInstrument,
  formatRatePercent,
  isObligation,
  resolveInstrument,
} from "@/modules/products/product.model";
import { PageHeader } from "@/components/page-header";

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
      isin: true,
      lineLabel: true,
      faceValue: true,
      minTicket: true,
      announcedRate: true,
      discountRate: true,
      couponRate: true,
      issuanceDate: true,
      maturityDate: true,
      subscriptionDeadline: true,
      totalVolume: true,
    },
  });
  const committedMap = await getCommittedVolumes(products.map((p) => p.id));

  const btCount = products.filter((p) => p.type === "BT").length;
  const otCount = products.length - btCount;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Marché primaire"
        icon={<ListBulletsIcon className="size-4" weight="duotone" />}
        title="Émissions ouvertes"
        description="Annonces d'adjudication du Ministère des Finances. Souscrivez au taux annoncé, par multiple du nominal, via votre banque partenaire."
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
              Les prochaines annonces d&apos;adjudication de Bons et Obligations du
              Trésor apparaîtront ici.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {products.map((p) => {
            const instrument = resolveInstrument({
              instrumentType: p.instrumentType,
              type: p.type,
              currency: p.currency,
            });
            const ot = isObligation(instrument);
            const days = daysUntil(p.subscriptionDeadline);
            const urgent = days <= 3;
            const rate = p.announcedRate ?? p.discountRate ?? p.couponRate;
            const committed = committedMap.get(p.id) ?? 0;
            const volumeLeft = calcVolumeLeft(p.totalVolume.toString(), committed);
            const pct = Math.min(
              100,
              Math.round((committed / Number(p.totalVolume)) * 100),
            );
            const faceValue =
              Number(p.faceValue) || faceValueFromInstrument(instrument);
            const minUnits = Math.max(
              1,
              Math.round(Number(p.minTicket) / faceValue),
            );

            return (
              <Card
                key={p.id}
                className="group/product flex flex-col ring-1 ring-rdc-navy/5 transition-shadow hover:shadow-md"
              >
                {/* En-tête : instrument + taux */}
                <CardContent className="flex items-start justify-between gap-4">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-semibold",
                          ot
                            ? "border-rdc-navy/20 bg-rdc-navy/10 text-rdc-navy"
                            : "border-primary/20 bg-primary/10 text-primary",
                        )}
                      >
                        {INSTRUMENT_SHORT[instrument]}
                      </Badge>
                      <Badge variant="outline">{p.currency}</Badge>
                      {urgent && (
                        <Badge
                          variant="outline"
                          className="gap-1 border-destructive/20 bg-destructive/10 text-destructive"
                        >
                          <ClockIcon className="size-3" weight="bold" />
                          {days}j restant{days > 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold leading-snug text-rdc-navy">
                        {p.lineLabel ?? p.code}
                      </h2>
                      <p className="truncate font-mono text-xs text-muted-foreground">
                        {p.isin ? `ISIN ${p.isin}` : p.code}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[2rem] font-bold leading-none tracking-tight text-primary">
                      {formatRatePercent(rate)}
                    </p>
                    <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Taux annoncé
                    </p>
                  </div>
                </CardContent>

                {/* Chiffres clés */}
                <CardContent>
                  <div className="grid grid-cols-3 divide-x divide-border/70 rounded-lg border border-border/70 bg-muted/30">
                    <Stat
                      label="Montant annoncé"
                      value={formatAmount(p.totalVolume.toString(), p.currency)}
                    />
                    <Stat
                      label="Nominal unitaire"
                      value={formatAmount(String(faceValue), p.currency)}
                    />
                    <Stat
                      label={`Minimum · ${minUnits} titres`}
                      value={formatAmount(p.minTicket.toString(), p.currency)}
                    />
                  </div>
                </CardContent>

                {/* Calendrier */}
                <CardContent>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <DateItem
                      label="Émission"
                      value={formatDate(p.issuanceDate)}
                    />
                    <DateItem
                      label="Clôture"
                      value={formatDate(p.subscriptionDeadline)}
                      highlight={urgent}
                    />
                    <DateItem
                      label={ot ? "Remboursement" : "Échéance"}
                      value={formatDate(p.maturityDate)}
                    />
                  </div>
                </CardContent>

                {/* Volume */}
                <CardContent className="mt-auto">
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Souscrit{" "}
                      <span className="font-medium text-foreground">{pct}%</span>
                    </span>
                    <span className="text-muted-foreground">
                      Disponible{" "}
                      <span className="font-medium text-foreground">
                        {formatAmount(volumeLeft.toString(), p.currency)}
                      </span>
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </CardContent>

                <CardFooter className="justify-between gap-3 bg-muted/20">
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarBlankIcon className="size-3.5" weight="duotone" />
                    {urgent ? (
                      <span className="font-medium text-destructive">
                        Clôture dans {days} jour{days > 1 ? "s" : ""}
                      </span>
                    ) : (
                      <>Encore {days} jours pour souscrire</>
                    )}
                  </p>
                  <Button
                    size="sm"
                    render={<Link href={`/products/${p.id}`} />}
                  >
                    Souscrire
                    <ArrowRightIcon
                      className="size-3.5 transition-transform group-hover/product:translate-x-0.5"
                      weight="bold"
                    />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-3 py-2.5">
      <p className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
        {value}
      </p>
    </div>
  );
}

function DateItem({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 truncate text-sm font-medium",
          highlight ? "text-destructive" : "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}
