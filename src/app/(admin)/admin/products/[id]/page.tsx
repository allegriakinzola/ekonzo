import { notFound } from "next/navigation";
import {
  CalendarBlankIcon,
  ChartBarIcon,
  ReceiptIcon,
} from "@phosphor-icons/react/dist/ssr";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { InfoList, InfoRow } from "@/components/info-list";
import { Avatar, BankLogo, EmptyState, StatCard } from "@/components/data-display";
import {
  COMMITTED_STATUSES,
  DISCARDED_STATUSES,
  InstrumentBadge,
  PRODUCT_STATUS_LABELS,
  ProductStatusBadge,
  SubscriptionStatusBadge,
  paymentChannelLabel,
} from "@/components/status-badges";
import { daysBetween } from "@/modules/products/pricing";
import { daysUntil, formatAmount, formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { cn } from "@/lib/utils";
import {
  INSTRUMENT_LABELS,
  INSTRUMENT_SHORT,
  formatRatePercent,
  isObligation,
  principalRepaymentLabel,
  resolveInstrument,
} from "@/modules/products/product.model";
import { ProductDetailActions } from "./ProductDetailActions";

const STATUS_TRANSITIONS: Record<string, string> = {
  DRAFT: "OPEN",
  OPEN: "CLOSED",
  CLOSED: "ADJUDICATED",
  ADJUDICATED: "ACTIVE",
  ACTIVE: "MATURED",
};

export default async function AdminProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["ADMIN", "SUPER_ADMIN"]);
  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      subscriptions: {
        include: {
          user: { select: { name: true, email: true } },
          paymentSession: {
            select: {
              method: true,
              partnerBank: { select: { shortName: true, logoUrl: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!product) notFound();

  const instrument = resolveInstrument({
    instrumentType: product.instrumentType,
    type: product.type,
    currency: product.currency,
  });
  const ot = isObligation(instrument);
  const announced =
    product.announcedRate ?? product.discountRate ?? product.couponRate;
  const nextStatus = STATUS_TRANSITIONS[product.status];

  const realSubs = product.subscriptions.filter(
    (s) => !DISCARDED_STATUSES.includes(s.status),
  );
  const discardedCount = product.subscriptions.length - realSubs.length;
  const requested = realSubs.reduce((sum, s) => sum + Number(s.amount), 0);
  const committed = realSubs
    .filter((s) => COMMITTED_STATUSES.includes(s.status))
    .reduce((sum, s) => sum + Number(s.amount), 0);
  const total = Number(product.totalVolume);
  const pct = total > 0 ? Math.min(100, Math.round((requested / total) * 100)) : 0;
  const left = Math.max(0, total - requested);
  const tenorDays = daysBetween(product.issuanceDate, product.maturityDate);
  const days = daysUntil(product.subscriptionDeadline);
  const investors = new Set(realSubs.map((s) => s.userId)).size;

  return (
    <div className="space-y-8">
      <PageHeader
        backHref="/admin/products"
        backLabel="Émissions"
        eyebrow="Annonce d'adjudication"
        icon={<ChartBarIcon className="size-4" weight="duotone" />}
        title={product.lineLabel ?? product.code}
        description={
          <>
            {INSTRUMENT_LABELS[instrument]}
            {product.isin ? ` · ISIN ${product.isin}` : ""} · Code interne{" "}
            <span className="font-mono">{product.code}</span>
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            <InstrumentBadge
              short={INSTRUMENT_SHORT[instrument]}
              isObligation={ot}
              className="h-7 px-2.5"
            />
            <ProductStatusBadge status={product.status} className="h-7 px-2.5" />
          </div>
        }
      />

      <Card className="overflow-hidden ring-1 ring-rdc-navy/5">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px]">
          <CardContent className="space-y-6 p-6">
            <div className="grid grid-cols-1 divide-y divide-border/70 rounded-xl border border-border/80 bg-muted/20 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {[
                {
                  label: "Montant annoncé",
                  value: formatAmount(total, product.currency),
                },
                {
                  label: "Nominal unitaire",
                  value: formatAmount(
                    product.faceValue.toString(),
                    product.currency,
                  ),
                },
                {
                  label: "Minimum · 10 titres",
                  value: formatAmount(
                    product.minTicket.toString(),
                    product.currency,
                  ),
                },
              ].map((s) => (
                <div key={s.label} className="px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {s.label}
                  </p>
                  <p className="mt-1 text-base font-bold text-rdc-navy">
                    {s.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                {
                  label: "Émission",
                  value: formatDate(product.issuanceDate),
                  hint: `Durée ${tenorDays} jours`,
                },
                {
                  label: "Clôture des souscriptions",
                  value: formatDate(product.subscriptionDeadline),
                  hint:
                    product.status === "OPEN"
                      ? days > 0
                        ? `J-${days}`
                        : days === 0
                          ? "Aujourd'hui"
                          : "Dépassée"
                      : undefined,
                  highlight: product.status === "OPEN" && days <= 3,
                },
                {
                  label: ot ? "Remboursement" : "Échéance",
                  value: formatDate(product.maturityDate),
                  hint: ot
                    ? principalRepaymentLabel(product.principalRepaymentMode)
                    : "Nominal remboursé au pair",
                },
              ].map((d) => (
                <div
                  key={d.label}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border px-4 py-3",
                    d.highlight
                      ? "border-amber-200 bg-amber-50/60"
                      : "border-border/80 bg-card",
                  )}
                >
                  <CalendarBlankIcon
                    className={cn(
                      "mt-0.5 size-4 shrink-0",
                      d.highlight ? "text-amber-700" : "text-muted-foreground",
                    )}
                    weight="duotone"
                  />
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {d.label}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-rdc-navy">
                      {d.value}
                    </p>
                    {d.hint && (
                      <p
                        className={cn(
                          "text-[11px]",
                          d.highlight
                            ? "font-semibold text-amber-700"
                            : "text-muted-foreground",
                        )}
                      >
                        {d.hint}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Souscrit {pct}%{" "}
                  <span className="text-muted-foreground/70">
                    · {formatAmount(committed, product.currency)} confirmés
                  </span>
                </span>
                <span className="font-semibold text-rdc-navy">
                  {formatAmount(left, product.currency)} disponible
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </CardContent>

          <aside className="border-t border-border/70 bg-[linear-gradient(160deg,oklch(0.985_0.01_220)_0%,oklch(0.96_0.02_240)_100%)] p-6 lg:border-l lg:border-t-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Taux annoncé par le Ministère
            </p>
            <p className="mt-1 text-4xl font-bold tracking-tight text-primary">
              {formatRatePercent(announced)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {ot
                ? "Intérêts périodiques, nominal au pair"
                : "Précompté à la souscription"}
            </p>

            <InfoList className="mt-5">
              <InfoRow label="Devise" value={product.currency} />
              {ot && (
                <InfoRow
                  label="Intérêts / an"
                  value={
                    product.interestPeriodsPerYear
                      ? `${product.interestPeriodsPerYear} paiement${product.interestPeriodsPerYear > 1 ? "s" : ""}`
                      : "—"
                  }
                />
              )}
              <InfoRow
                label="Adjudication"
                value={formatDate(product.adjudicationDate)}
              />
              <InfoRow
                label="Résultats"
                value={
                  product.resultsDate ? formatDate(product.resultsDate) : "—"
                }
                muted={!product.resultsDate}
              />
              <InfoRow
                label="Règlement"
                value={
                  product.settlementDate
                    ? formatDate(product.settlementDate)
                    : "—"
                }
                muted={!product.settlementDate}
              />
              <InfoRow
                label="Créée le"
                value={formatDate(product.createdAt)}
                muted
              />
            </InfoList>
          </aside>
        </div>
      </Card>

      {nextStatus && (
        <ProductDetailActions
          productId={product.id}
          currentStatus={product.status}
          nextStatus={nextStatus}
          nextLabel={PRODUCT_STATUS_LABELS[nextStatus]}
        />
      )}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Souscriptions"
          value={realSubs.length}
          sub={
            discardedCount > 0
              ? `${investors} investisseur${investors > 1 ? "s" : ""} · ${discardedCount} abandonnée${discardedCount > 1 ? "s" : ""}`
              : `${investors} investisseur${investors > 1 ? "s" : ""}`
          }
          icon={<ReceiptIcon className="size-5" weight="duotone" />}
          accent="text-rdc-navy bg-rdc-navy/10 ring-rdc-navy/15"
        />
        <StatCard
          label="Montant demandé"
          value={
            <span className="text-xl">
              {formatAmount(requested, product.currency)}
            </span>
          }
          sub={`${pct}% du montant annoncé`}
          icon={<ChartBarIcon className="size-5" weight="duotone" />}
        />
        <StatCard
          label="Montant confirmé"
          value={
            <span className="text-xl">
              {formatAmount(committed, product.currency)}
            </span>
          }
          sub="Paiement confirmé par la banque"
          icon={<ReceiptIcon className="size-5" weight="duotone" />}
          accent="text-emerald-700 bg-emerald-50 ring-emerald-100"
        />
      </section>

      <Card className="ring-1 ring-rdc-navy/5">
        <CardHeader className="border-b [.border-b]:pb-4">
          <CardTitle className="text-base">
            Souscriptions ({realSubs.length})
          </CardTitle>
          <CardDescription>
            Demandes liées à cette émission, réglées via la banque partenaire de
            chaque investisseur
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {realSubs.length === 0 ? (
            <EmptyState
              icon={<ReceiptIcon className="size-6" weight="duotone" />}
              title="Aucune souscription"
              description="Les demandes des investisseurs sur cette émission apparaîtront ici."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="px-4">Investisseur</TableHead>
                  <TableHead className="px-4">Montant</TableHead>
                  <TableHead className="px-4">Banque · règlement</TableHead>
                  <TableHead className="px-4">Statut</TableHead>
                  <TableHead className="px-4">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {realSubs.map((s) => {
                  const bank = s.paymentSession?.partnerBank;
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="px-4 py-3 whitespace-normal">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={s.user.name} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {s.user.name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {s.user.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <p className="text-sm font-semibold">
                          {formatAmount(s.amount.toString(), product.currency)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {s.units} titre{s.units > 1 ? "s" : ""}
                          {s.settlementAmount &&
                            ` · réglé ${formatAmount(s.settlementAmount.toString(), product.currency)}`}
                        </p>
                      </TableCell>
                      <TableCell className="px-4 py-3 whitespace-normal">
                        {bank ? (
                          <div className="flex items-center gap-2">
                            <BankLogo
                              logoUrl={bank.logoUrl}
                              shortName={bank.shortName}
                              size="sm"
                            />
                            <div className="leading-tight">
                              <p className="text-sm font-medium">
                                {bank.shortName}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {s.paymentSession?.method === "MOBILE_MONEY"
                                  ? "Mobile Money"
                                  : paymentChannelLabel(s.paymentChannel)}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {paymentChannelLabel(s.paymentChannel)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <SubscriptionStatusBadge status={s.status} />
                      </TableCell>
                      <TableCell className="px-4 py-3 text-muted-foreground">
                        {formatDate(s.createdAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
