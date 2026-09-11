import { notFound } from "next/navigation";
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
import { requireRole } from "@/lib/session";
import { cn } from "@/lib/utils";
import { getActiveBankLink } from "@/modules/banks/bank-link.service";
import {
  INSTRUMENT_LABELS,
  INSTRUMENT_SHORT,
  faceValueFromInstrument,
  formatRatePercent,
  isObligation,
  principalRepaymentLabel,
  resolveInstrument,
} from "@/modules/products/product.model";
import { SubscribeForm } from "./SubscribeForm";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireRole("CLIENT");

  const [p, bankLink] = await Promise.all([
    prisma.product.findUnique({ where: { id } }),
    getActiveBankLink(session.user.id),
  ]);

  if (!p || p.status !== "OPEN") notFound();

  const instrument = resolveInstrument({
    instrumentType: p.instrumentType,
    type: p.type,
    currency: p.currency,
  });
  const ot = isObligation(instrument);
  const committedMap = await getCommittedVolumes([p.id]);
  const committed = committedMap.get(p.id) ?? 0;
  const days = daysUntil(p.subscriptionDeadline);
  const rate = p.announcedRate ?? p.discountRate ?? p.couponRate;
  const volumeLeft = calcVolumeLeft(p.totalVolume.toString(), committed);
  const pct = Math.round((committed / Number(p.totalVolume)) * 100);
  const faceValue = Number(p.faceValue) || faceValueFromInstrument(instrument);
  const minUnits = Math.max(1, Math.round(Number(p.minTicket) / faceValue));

  const productForForm = {
    id: p.id,
    instrument,
    currency: p.currency,
    faceValue,
    minUnits,
    volumeLeft,
    annualRate: Number(rate ?? 0),
    issuanceDate: p.issuanceDate.toISOString(),
    maturityDate: p.maturityDate.toISOString(),
    interestPeriodsPerYear: p.interestPeriodsPerYear,
    principalRepaymentMode: p.principalRepaymentMode,
    lineLabel: p.lineLabel ?? p.code,
    isin: p.isin,
  };

  const bankForForm = bankLink
    ? {
        name: bankLink.partnerBank.name,
        shortName: bankLink.partnerBank.shortName,
        logoUrl: bankLink.partnerBank.logoUrl,
        accountNumber: bankLink.accountNumber,
        accountName: bankLink.accountName,
        currency: bankLink.currency,
      }
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0"
          render={<Link href="/products" />}
        >
          Émissions
        </Button>
        <span>/</span>
        <span className="font-medium text-foreground">{p.isin ?? p.code}</span>
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-2 text-primary">
          <ListBulletsIcon className="size-5" weight="duotone" />
          <span className="text-xs font-medium uppercase tracking-wide">
            Annonce d&apos;adjudication
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-rdc-navy">
          {p.lineLabel ?? p.code}
        </h1>
        <p className="text-sm text-muted-foreground">
          {INSTRUMENT_LABELS[instrument]}
          {p.isin ? ` · ISIN ${p.isin}` : ""}
        </p>
      </div>

      <Card className="ring-1 ring-rdc-navy/5">
        <CardHeader className="border-b [.border-b]:pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-primary/20 bg-primary/10 text-primary"
                >
                  {INSTRUMENT_SHORT[instrument]}
                </Badge>
                <Badge variant="outline">{p.currency}</Badge>
                {days <= 3 && (
                  <Badge
                    variant="outline"
                    className="border-destructive/20 bg-destructive/10 text-destructive"
                  >
                    {days}j restant{days > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
              <CardTitle className="text-lg">
                {ot ? "Obligation du Trésor" : "Bon du Trésor"}
              </CardTitle>
              <CardDescription>
                Émission le {formatDate(p.issuanceDate)} ·{" "}
                {ot ? "Remboursement final" : "Remboursement"} le{" "}
                {formatDate(p.maturityDate)}
              </CardDescription>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-primary">
                {formatRatePercent(rate)}
              </p>
              <p className="text-xs text-muted-foreground">
                Taux annoncé · l&apos;an
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 pt-4">
          {/* Chiffres clés — identiques aux cartes de la liste */}
          <div className="grid grid-cols-3 divide-x divide-border/70 rounded-lg border border-border/70 bg-muted/30">
            <DetailStat
              label="Montant annoncé"
              value={formatAmount(p.totalVolume.toString(), p.currency)}
            />
            <DetailStat
              label="Nominal unitaire"
              value={formatAmount(String(faceValue), p.currency)}
            />
            <DetailStat
              label={`Minimum · ${minUnits} titres`}
              value={formatAmount(p.minTicket.toString(), p.currency)}
            />
          </div>

          {/* Calendrier */}
          <div className="grid grid-cols-3 gap-3">
            <DateItem label="Émission" value={formatDate(p.issuanceDate)} />
            <DateItem
              label="Clôture"
              value={formatDate(p.subscriptionDeadline)}
              highlight={days <= 3}
            />
            <DateItem
              label={ot ? "Remboursement" : "Échéance"}
              value={formatDate(p.maturityDate)}
            />
          </div>

          {ot && (
            <div className="grid grid-cols-2 gap-3">
              <DateItem
                label="Paiements d'intérêts / an"
                value={
                  p.interestPeriodsPerYear ? `${p.interestPeriodsPerYear}` : "—"
                }
              />
              <DateItem
                label="Remboursement du principal"
                value={principalRepaymentLabel(p.principalRepaymentMode)}
              />
            </div>
          )}

          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
            {ot ? (
              <>
                Titre à moyen/long terme. Vous souscrivez <strong>au pair</strong>{" "}
                au taux annoncé : les intérêts sont versés{" "}
                {p.interestPeriodsPerYear
                  ? `${p.interestPeriodsPerYear} fois par an`
                  : "périodiquement"}{" "}
                et le principal est remboursé{" "}
                {principalRepaymentLabel(p.principalRepaymentMode).toLowerCase()}.
              </>
            ) : (
              <>
                Titre à court terme à <strong>intérêts précomptés</strong> : vous
                payez moins que le nominal et recevez le nominal complet à
                l&apos;échéance.
              </>
            )}
            {instrument === "BTI" || instrument === "OTI"
              ? " Titre libellé en FC et indexé au cours USD/CDF."
              : ""}
          </div>

          <div>
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
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <SubscribeForm product={productForForm} bank={bankForForm} />
    </div>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
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
