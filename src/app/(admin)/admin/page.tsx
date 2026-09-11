import Link from "next/link";
import {
  ArrowRightIcon,
  ChartBarIcon,
  ChartPieSliceIcon,
  ClockIcon,
  CurrencyCircleDollarIcon,
  ReceiptIcon,
  TrendUpIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
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
import { BankLogo, EmptyState, StatCard } from "@/components/data-display";
import {
  DISCARDED_STATUSES,
  InstrumentBadge,
  ProductStatusBadge,
  SubscriptionStatusBadge,
  paymentChannelLabel,
} from "@/components/status-badges";
import { daysUntil, formatAmount, formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getCommittedVolumes } from "@/lib/product-volume";
import { cn } from "@/lib/utils";
import { getAdminStats } from "@/modules/admin/stats.service";
import {
  INSTRUMENT_SHORT,
  formatRatePercent,
  isObligation,
  resolveInstrument,
} from "@/modules/products/product.model";
import {
  InstrumentAmountChart,
  KindDonutChart,
  SubscriptionsTimelineChart,
} from "./components/AdminCharts";

export default async function AdminOverviewPage() {
  const [investors, linkedInvestors, activeBanks, openProducts, stats, recentSubs] =
    await Promise.all([
      prisma.user.count({ where: { role: "CLIENT", emailVerified: true } }),
      prisma.bankLink.count(),
      prisma.partnerBank.count({ where: { isActive: true } }),
      prisma.product.findMany({
        where: { status: "OPEN" },
        orderBy: { subscriptionDeadline: "asc" },
        take: 4,
      }),
      getAdminStats(30),
      prisma.subscription.findMany({
        take: 8,
        where: { status: { notIn: DISCARDED_STATUSES } },
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { name: true, email: true } },
          product: {
            select: {
              code: true,
              type: true,
              currency: true,
              instrumentType: true,
              lineLabel: true,
            },
          },
          paymentSession: {
            select: {
              method: true,
              partnerBank: { select: { shortName: true, logoUrl: true } },
            },
          },
        },
      }),
    ]);

  const committed = await getCommittedVolumes(openProducts.map((p) => p.id));
  const cdf = stats.currencies.find((c) => c.currency === "CDF")!;
  const usd = stats.currencies.find((c) => c.currency === "USD")!;
  const bt = stats.kinds.find((k) => k.kind === "BT")!;
  const ot = stats.kinds.find((k) => k.kind === "OT")!;
  const totalSubs = stats.totals.paidCount + stats.totals.pendingCount;
  const last7 = stats.timeline
    .slice(-7)
    .reduce((s, p) => s + p.bt + p.ot + p.pending, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Ministère des Finances"
        icon={<ChartBarIcon className="size-4" weight="duotone" />}
        title="Vue d'ensemble"
        description="Suivi des émissions de Bons et Obligations du Trésor, des souscriptions des investisseurs et des paiements réglés via les banques partenaires."
        actions={
          <Button render={<Link href="/admin/products" />}>
            Gérer les émissions
            <ArrowRightIcon weight="bold" />
          </Button>
        }
      />

      {/* KPIs */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Investisseurs"
          value={investors}
          sub={`${linkedInvestors} avec banque liée · ${activeBanks} banque${activeBanks > 1 ? "s" : ""} active${activeBanks > 1 ? "s" : ""}`}
          icon={<UsersThreeIcon className="size-5" weight="duotone" />}
        />
        <StatCard
          label="Souscriptions"
          value={totalSubs}
          sub={`${stats.totals.paidCount} payée${stats.totals.paidCount > 1 ? "s" : ""} · ${stats.totals.pendingCount} en attente`}
          icon={<ReceiptIcon className="size-5" weight="duotone" />}
          accent="text-rdc-navy bg-rdc-navy/10 ring-rdc-navy/15"
        />
        <StatCard
          label="Émissions ouvertes"
          value={openProducts.length}
          sub={`${bt.products} Bons · ${ot.products} Obligations publiées`}
          icon={<ChartBarIcon className="size-5" weight="duotone" />}
          accent="text-emerald-700 bg-emerald-50 ring-emerald-100"
        />
        <StatCard
          label="7 derniers jours"
          value={last7}
          sub="Nouvelles souscriptions"
          icon={<TrendUpIcon className="size-5" weight="duotone" />}
          accent="text-amber-700 bg-amber-50 ring-amber-100"
        />
      </section>

      {/* Montants payés par devise */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[cdf, usd].map((c) => {
          const pct =
            c.announced > 0 ? Math.min(100, Math.round((c.paid / c.announced) * 100)) : 0;
          return (
            <div
              key={c.currency}
              className="rounded-xl border border-border/80 bg-card p-5 shadow-sm ring-1 ring-rdc-navy/5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Montant payé · {c.currency === "CDF" ? "Francs congolais" : "Dollars US"}
                  </p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-rdc-navy">
                    {formatAmount(c.paid, c.currency)}
                  </p>
                </div>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
                  <CurrencyCircleDollarIcon className="size-5" weight="duotone" />
                </span>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>
                    {pct}% du montant annoncé ({formatAmount(c.announced, c.currency)})
                  </span>
                  {c.pending > 0 && (
                    <span className="font-medium text-amber-700">
                      {formatAmount(c.pending, c.currency)} attendus
                    </span>
                  )}
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Graphiques */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="ring-1 ring-rdc-navy/5 xl:col-span-2">
          <CardHeader className="border-b [.border-b]:pb-4">
            <CardTitle className="text-base">Montants par instrument</CardTitle>
            <CardDescription>
              Montant annoncé par le Ministère, payé par les investisseurs et en attente
              de règlement
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-6 pt-5 md:grid-cols-2">
            {[cdf, usd].map((c) => (
              <div key={c.currency}>
                <p className="mb-2 text-xs font-semibold text-rdc-navy">
                  {c.currency === "CDF" ? "Instruments indexés (CDF)" : "Instruments en USD"}
                </p>
                <InstrumentAmountChart
                  currency={c.currency}
                  data={stats.instruments
                    .filter((i) => i.currency === c.currency)
                    .map((i) => ({
                      short: i.short,
                      announced: i.announced,
                      paid: i.paid,
                      pending: i.pending,
                    }))}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="ring-1 ring-rdc-navy/5">
          <CardHeader className="border-b [.border-b]:pb-4">
            <div className="flex items-center gap-2">
              <ChartPieSliceIcon className="size-4 text-primary" weight="duotone" />
              <CardTitle className="text-base">Bons vs Obligations</CardTitle>
            </div>
            <CardDescription>Souscriptions payées par famille de titres</CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            <KindDonutChart bt={bt.paidCount} ot={ot.paidCount} />
            <ul className="mt-4 divide-y divide-border/70 text-sm">
              {stats.instruments.map((i) => (
                <li key={i.instrument} className="flex items-center justify-between py-2">
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        "size-2.5 rounded-full",
                        i.kind === "OT" ? "bg-rdc-navy" : "bg-primary",
                      )}
                    />
                    <span className="font-medium">{i.short}</span>
                    <span className="text-xs text-muted-foreground">
                      {i.products} émission{i.products > 1 ? "s" : ""}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="font-semibold tabular-nums">{i.paidCount}</span>
                    <span className="ml-1 text-xs text-muted-foreground">
                      · {formatAmount(i.paid, i.currency)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="ring-1 ring-rdc-navy/5 xl:col-span-2">
          <CardHeader className="border-b [.border-b]:pb-4">
            <CardTitle className="text-base">Activité sur 30 jours</CardTitle>
            <CardDescription>
              Nombre de souscriptions par jour, Bons et Obligations payés et paiements
              attendus
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            <SubscriptionsTimelineChart data={stats.timeline} />
          </CardContent>
        </Card>

        <Card className="ring-1 ring-rdc-navy/5">
          <CardHeader className="border-b [.border-b]:pb-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Émissions ouvertes</CardTitle>
                <CardDescription>Par date de clôture</CardDescription>
              </div>
              <Button variant="ghost" size="sm" render={<Link href="/admin/products" />}>
                Toutes
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {openProducts.length === 0 ? (
              <EmptyState
                icon={<ChartBarIcon className="size-6" weight="duotone" />}
                title="Aucune émission ouverte"
                action={
                  <Button size="sm" variant="outline" render={<Link href="/admin/products" />}>
                    Publier une annonce
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y divide-border/70">
                {openProducts.map((p) => {
                  const instrument = resolveInstrument({
                    instrumentType: p.instrumentType,
                    type: p.type,
                    currency: p.currency,
                  });
                  const total = Number(p.totalVolume);
                  const used = committed.get(p.id) ?? 0;
                  const pct =
                    total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
                  const days = daysUntil(p.subscriptionDeadline);
                  const rate = p.announcedRate ?? p.discountRate ?? p.couponRate;
                  return (
                    <li key={p.id}>
                      <Link
                        href={`/admin/products/${p.id}`}
                        className="block px-5 py-4 transition-colors hover:bg-muted/40"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <InstrumentBadge
                                short={INSTRUMENT_SHORT[instrument]}
                                isObligation={isObligation(instrument)}
                              />
                              <ProductStatusBadge status={p.status} />
                            </div>
                            <p className="mt-1.5 truncate text-sm font-semibold text-rdc-navy">
                              {p.lineLabel ?? p.code}
                            </p>
                            <p className="font-mono text-[11px] text-muted-foreground">
                              {p.isin ?? p.code}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-lg font-bold text-primary">
                              {formatRatePercent(rate)}
                            </p>
                            <p
                              className={cn(
                                "inline-flex items-center gap-1 text-[11px]",
                                days <= 3
                                  ? "font-semibold text-amber-700"
                                  : "text-muted-foreground",
                              )}
                            >
                              <ClockIcon className="size-3" />
                              {days > 0 ? `J-${days}` : "Clôture aujourd'hui"}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>Souscrit {pct}%</span>
                            <span>
                              {formatAmount(used, p.currency)} / {formatAmount(total, p.currency)}
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Souscriptions récentes — pleine largeur */}
      <Card className="ring-1 ring-rdc-navy/5">
        <CardHeader className="border-b [.border-b]:pb-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Souscriptions récentes</CardTitle>
              <CardDescription>
                Dernières demandes réglées par les banques partenaires
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" render={<Link href="/admin/subscriptions" />}>
              Voir toutes
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {recentSubs.length === 0 ? (
            <EmptyState
              icon={<ReceiptIcon className="size-6" weight="duotone" />}
              title="Aucune souscription"
              description="Les demandes des investisseurs apparaîtront ici dès la première souscription."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="px-4">Investisseur</TableHead>
                  <TableHead className="px-4">Émission</TableHead>
                  <TableHead className="px-4">Montant</TableHead>
                  <TableHead className="px-4">Banque</TableHead>
                  <TableHead className="px-4">Statut</TableHead>
                  <TableHead className="px-4 text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSubs.map((s) => {
                  const instrument = resolveInstrument({
                    instrumentType: s.product.instrumentType,
                    type: s.product.type,
                    currency: s.product.currency,
                  });
                  const bank = s.paymentSession?.partnerBank;
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="px-4 py-3">
                        <p className="text-sm font-medium">{s.user.name}</p>
                        <p className="max-w-[220px] truncate text-xs text-muted-foreground">
                          {s.user.email}
                        </p>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <InstrumentBadge
                            short={INSTRUMENT_SHORT[instrument]}
                            isObligation={isObligation(instrument)}
                          />
                          <span className="text-xs text-muted-foreground">
                            {s.product.lineLabel ?? s.product.code}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <p className="text-sm font-semibold">
                          {formatAmount(s.amount.toString(), s.currency)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {s.units} titre{s.units > 1 ? "s" : ""}
                        </p>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        {bank ? (
                          <div className="flex items-center gap-2">
                            <BankLogo logoUrl={bank.logoUrl} shortName={bank.shortName} size="sm" />
                            <div className="leading-tight">
                              <p className="text-sm font-medium">{bank.shortName}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {s.paymentSession?.method === "MOBILE_MONEY"
                                  ? "Mobile Money"
                                  : paymentChannelLabel(s.paymentChannel)}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <SubscriptionStatusBadge status={s.status} />
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right text-muted-foreground">
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
