import Link from "next/link";
import {
  ArrowRightIcon,
  BuildingsIcon,
  ChartBarIcon,
  ClockIcon,
  CurrencyCircleDollarIcon,
  ReceiptIcon,
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
  COMMITTED_STATUSES,
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
import {
  INSTRUMENT_SHORT,
  formatRatePercent,
  isObligation,
  resolveInstrument,
} from "@/modules/products/product.model";

export default async function AdminOverviewPage() {
  const [
    investors,
    linkedInvestors,
    activeBanks,
    openProducts,
    realSubs,
    pendingPayment,
    committedByCurrency,
    recentSubs,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "CLIENT" } }),
    prisma.bankLink.count(),
    prisma.partnerBank.count({ where: { isActive: true } }),
    prisma.product.findMany({
      where: { status: "OPEN" },
      orderBy: { subscriptionDeadline: "asc" },
      take: 4,
    }),
    prisma.subscription.count({
      where: { status: { notIn: DISCARDED_STATUSES } },
    }),
    prisma.subscription.count({ where: { status: "PENDING_PAYMENT" } }),
    prisma.subscription.groupBy({
      by: ["currency"],
      where: { status: { in: COMMITTED_STATUSES } },
      _sum: { amount: true },
    }),
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
  const committedCdf = Number(
    committedByCurrency.find((c) => c.currency === "CDF")?._sum.amount ?? 0,
  );
  const committedUsd = Number(
    committedByCurrency.find((c) => c.currency === "USD")?._sum.amount ?? 0,
  );

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

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Investisseurs"
          value={investors}
          sub={`${linkedInvestors} avec banque liée`}
          icon={<UsersThreeIcon className="size-5" weight="duotone" />}
          accent="text-primary bg-primary/10 ring-primary/15"
        />
        <StatCard
          label="Souscriptions"
          value={realSubs}
          sub={
            pendingPayment > 0
              ? `${pendingPayment} en attente de paiement`
              : "Aucun paiement en attente"
          }
          icon={<ReceiptIcon className="size-5" weight="duotone" />}
          accent="text-rdc-navy bg-rdc-navy/10 ring-rdc-navy/15"
        />
        <StatCard
          label="Émissions ouvertes"
          value={openProducts.length}
          sub={`${activeBanks} banque${activeBanks > 1 ? "s" : ""} partenaire${activeBanks > 1 ? "s" : ""} active${activeBanks > 1 ? "s" : ""}`}
          icon={<ChartBarIcon className="size-5" weight="duotone" />}
          accent="text-emerald-700 bg-emerald-50 ring-emerald-100"
        />
        <StatCard
          label="Volume confirmé"
          value={
            <span className="text-xl">
              {formatAmount(committedCdf, "CDF")}
            </span>
          }
          sub={formatAmount(committedUsd, "USD")}
          icon={<CurrencyCircleDollarIcon className="size-5" weight="duotone" />}
          accent="text-amber-700 bg-amber-50 ring-amber-100"
        />
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card className="ring-1 ring-rdc-navy/5">
          <CardHeader className="border-b [.border-b]:pb-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">
                  Souscriptions récentes
                </CardTitle>
                <CardDescription>
                  Dernières demandes réglées par les banques partenaires
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                render={<Link href="/admin/subscriptions" />}
              >
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
                        <TableCell className="px-4 py-3 whitespace-normal">
                          <p className="text-sm font-medium">{s.user.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(s.createdAt)}
                          </p>
                        </TableCell>
                        <TableCell className="px-4 py-3 whitespace-normal">
                          <div className="flex items-center gap-2">
                            <InstrumentBadge
                              short={INSTRUMENT_SHORT[instrument]}
                              isObligation={isObligation(instrument)}
                            />
                            <span className="truncate text-xs text-muted-foreground">
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
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <SubscriptionStatusBadge status={s.status} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="ring-1 ring-rdc-navy/5">
            <CardHeader className="border-b [.border-b]:pb-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Émissions ouvertes</CardTitle>
                  <CardDescription>Par date de clôture</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  render={<Link href="/admin/products" />}
                >
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
                    <Button
                      size="sm"
                      variant="outline"
                      render={<Link href="/admin/products" />}
                    >
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
                    const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
                    const days = daysUntil(p.subscriptionDeadline);
                    const rate =
                      p.announcedRate ?? p.discountRate ?? p.couponRate;
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
                                {formatAmount(used, p.currency)} /{" "}
                                {formatAmount(total, p.currency)}
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

          <Card className="ring-1 ring-rdc-navy/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Accès rapides</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {[
                {
                  href: "/admin/banks",
                  label: "Banques partenaires",
                  icon: BuildingsIcon,
                },
                {
                  href: "/admin/users",
                  label: "Utilisateurs",
                  icon: UsersThreeIcon,
                },
                {
                  href: "/admin/subscriptions",
                  label: "Souscriptions",
                  icon: ReceiptIcon,
                },
                {
                  href: "/admin/cif",
                  label: "Fichier client",
                  icon: ArrowRightIcon,
                },
              ].map((q) => (
                <Link
                  key={q.href}
                  href={q.href}
                  className="flex items-center gap-2.5 rounded-lg border border-border/80 bg-muted/30 px-3 py-2.5 text-sm font-medium text-rdc-navy transition-colors hover:border-primary/30 hover:bg-primary/5"
                >
                  <q.icon className="size-4 text-primary" weight="duotone" />
                  {q.label}
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
