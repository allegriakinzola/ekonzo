import Link from "next/link";
import {
  BriefcaseIcon,
  CalendarBlankIcon,
  ChartLineUpIcon,
  HouseIcon,
  PlusIcon,
  StackIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/dist/ssr";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmissionCard } from "@/components/EmissionCard";
import { formatAmount, formatDate, daysUntil } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { cn } from "@/lib/utils";
import { getActiveBankLink } from "@/modules/banks/bank-link.service";

const QUICK_ACTIONS = [
  {
    href: "/products",
    label: "Souscrire à un produit",
    desc: "Bons du Trésor disponibles",
    icon: PlusIcon,
  },
  {
    href: "/portfolio",
    label: "Mon portefeuille",
    desc: "Suivi de vos placements et rendements",
    icon: ChartLineUpIcon,
  },
  {
    href: "/profile/bank",
    label: "Ma banque",
    desc: "Banque partenaire liée pour payer",
    icon: BriefcaseIcon,
  },
];

export default async function DashboardPage() {
  const session = await requireRole("CLIENT");
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { prenom: true, name: true },
  });
  const firstName =
    dbUser?.prenom?.trim() ||
    (session.user.name ?? "Utilisateur").split(" ")[0];
  const bankLink = await getActiveBankLink(session.user.id);

  const [subscriptions, openProducts, openCount] = await Promise.all([
    prisma.subscription.findMany({
      where: { userId: session.user.id },
      include: { product: { select: { maturityDate: true, currency: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.findMany({
      where: { status: "OPEN" },
      orderBy: { subscriptionDeadline: "asc" },
      take: 4,
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
    }),
    prisma.product.count({ where: { status: "OPEN" } }),
  ]);

  const realSubscriptions = subscriptions.filter(
    (s) => s.status !== "FAILED" && s.status !== "CANCELLED",
  );
  const activeOrAdjudicated = realSubscriptions.filter((s) =>
    ["ADJUDICATED", "ACTIVE", "PAYMENT_CONFIRMED", "SUBMITTED"].includes(s.status)
  );
  const investedUsd = activeOrAdjudicated
    .filter((s) => s.currency === "USD")
    .reduce((sum, s) => sum + Number(s.adjudicatedAmount ?? s.amount), 0);
  const investedCdf = activeOrAdjudicated
    .filter((s) => s.currency === "CDF")
    .reduce((sum, s) => sum + Number(s.adjudicatedAmount ?? s.amount), 0);

  const capitalValue =
    investedUsd > 0 && investedCdf > 0
      ? `${formatAmount(investedUsd.toString(), "USD")} · ${formatAmount(investedCdf.toString(), "CDF")}`
      : investedCdf > 0
        ? formatAmount(investedCdf.toString(), "CDF")
        : formatAmount(investedUsd.toString(), "USD");

  const nextMaturity = activeOrAdjudicated
    .map((s) => s.product.maturityDate)
    .filter(Boolean)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];

  const STAT_CARDS = [
    {
      label: "Capital investi",
      value: capitalValue,
      sub: activeOrAdjudicated.length > 0 ? `${activeOrAdjudicated.length} placement${activeOrAdjudicated.length > 1 ? "s" : ""} actif${activeOrAdjudicated.length > 1 ? "s" : ""}` : "Aucun placement actif",
      icon: BriefcaseIcon,
      accent: "text-primary bg-primary/10 ring-primary/15",
    },
    {
      label: "Souscriptions",
      value: realSubscriptions.length.toString(),
      sub: `${realSubscriptions.filter((s) => s.status === "PENDING_PAYMENT").length} en attente de paiement`,
      icon: ChartLineUpIcon,
      accent: "text-emerald-700 bg-emerald-50 ring-emerald-100",
    },
    {
      label: "Prochaine échéance",
      value: nextMaturity ? formatDate(nextMaturity) : "—",
      sub: nextMaturity ? `Dans ${daysUntil(nextMaturity)} jours` : "Aucune souscription active",
      icon: CalendarBlankIcon,
      accent: "text-rdc-navy bg-rdc-navy/10 ring-rdc-navy/15",
    },
    {
      label: "Émissions ouvertes",
      value: openCount.toString(),
      sub: openCount > 0 ? "Bons du Trésor disponibles" : "Aucune émission ouverte",
      icon: StackIcon,
      accent: "text-amber-700 bg-amber-50 ring-amber-100",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <HouseIcon className="size-5" weight="duotone" />
            <span className="text-xs font-medium uppercase tracking-wide">
              Espace investisseur
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-rdc-navy">
            Bonjour, {firstName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Bienvenue sur votre espace investisseur ekonzo
            {bankLink
              ? ` · banque ${bankLink.partnerBank.shortName}`
              : ""}
            .
          </p>
        </div>
        <Button render={<Link href="/products" />} size="lg">
          <PlusIcon className="size-4" weight="bold" />
          Nouveau placement
        </Button>
      </div>

      {!bankLink && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-950">
          <WarningCircleIcon className="size-4 text-amber-700" weight="fill" />
          <AlertTitle className="text-amber-900">
            Liez votre banque partenaire
          </AlertTitle>
          <AlertDescription className="flex flex-col gap-3 text-amber-800 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Les souscriptions aux titres publics passent par votre banque
              teneur de compte.
            </span>
            <Button
              render={<Link href="/profile/bank" />}
              size="sm"
              className="bg-amber-700 text-white hover:bg-amber-800"
            >
              Lier ma banque
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="ring-1 ring-rdc-navy/5">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <CardDescription className="text-[11px] font-medium uppercase tracking-wide">
                    {card.label}
                  </CardDescription>
                  <span
                    className={cn(
                      "inline-flex size-9 items-center justify-center rounded-lg ring-1",
                      card.accent,
                    )}
                  >
                    <Icon className="size-4" weight="duotone" />
                  </span>
                </div>
                <CardTitle className="text-xl font-bold tracking-tight">
                  {card.value}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{card.sub}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="space-y-4">
        <h2 className="text-base font-semibold text-rdc-navy">Actions rapides</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href} className="group">
                <Card className="h-full transition-shadow group-hover:shadow-md ring-1 ring-rdc-navy/5">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <span className="inline-flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
                        <Icon className="size-4" weight="duotone" />
                      </span>
                      <CardTitle className="text-sm group-hover:text-primary transition-colors">
                        {action.label}
                      </CardTitle>
                    </div>
                    <CardDescription>{action.desc}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-rdc-navy">
            Bons du Trésor disponibles
          </h2>
          <Button variant="outline" size="sm" render={<Link href="/products" />}>
            Voir tous
          </Button>
        </div>
        {openProducts.length === 0 ? (
          <Card className="ring-1 ring-rdc-navy/5">
            <CardContent className="py-10 text-center">
              <p className="font-medium text-sm">Aucun produit ouvert pour le moment</p>
              <p className="text-xs text-muted-foreground mt-1">
                Les prochaines émissions de Bons du Trésor apparaîtront ici.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {openProducts.map((p) => (
              <EmissionCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
