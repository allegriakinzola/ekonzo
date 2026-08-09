import Link from "next/link";
import {
  BriefcaseIcon,
  CalendarBlankIcon,
  ChartLineUpIcon,
  CreditCardIcon,
  HouseIcon,
  IdentificationCardIcon,
  PlusIcon,
  WarningCircleIcon,
  ClockIcon,
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
import { formatAmount, formatDate, daysUntil } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import {
  getCommittedVolumes,
  volumeLeft as calcVolumeLeft,
} from "@/lib/product-volume";
import { getUserKycStatus, requireRole } from "@/lib/session";
import { cn } from "@/lib/utils";

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
    href: "/kyc",
    label: "Vérification d'identité",
    desc: "Activez votre compte pour investir",
    icon: IdentificationCardIcon,
  },
];

export default async function DashboardPage() {
  const session = await requireRole("CLIENT");
  const userName = session.user.name ?? "Utilisateur";
  const firstName = userName.split(" ")[0];
  // Partagé avec le layout (React cache) — pas de 2ᵉ requête
  const kycStatus = await getUserKycStatus(session.user.id);
  const kycSubmitted =
    kycStatus === "SUBMITTED" || kycStatus === "UNDER_REVIEW";

  const [subscriptions, wallets, openProducts] = await Promise.all([
    prisma.subscription.findMany({
      where: { userId: session.user.id },
      include: { product: { select: { maturityDate: true, currency: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.wallet.findMany({ where: { userId: session.user.id } }),
    prisma.product.findMany({
      where: { status: "OPEN" },
      orderBy: { subscriptionDeadline: "asc" },
      take: 4,
      select: {
        id: true,
        code: true,
        currency: true,
        minTicket: true,
        discountRate: true,
        maturityDate: true,
        subscriptionDeadline: true,
        totalVolume: true,
      },
    }),
  ]);

  const committedMap = await getCommittedVolumes(openProducts.map((p) => p.id));

  const activeOrAdjudicated = subscriptions.filter((s) =>
    ["ADJUDICATED", "ACTIVE", "PAYMENT_CONFIRMED", "SUBMITTED"].includes(s.status)
  );
  const totalInvested = activeOrAdjudicated.reduce((sum, s) => sum + Number(s.adjudicatedAmount ?? s.amount), 0);
  const activeCurrency = activeOrAdjudicated[0]?.currency ?? "USD";

  const nextMaturity = activeOrAdjudicated
    .map((s) => s.product.maturityDate)
    .filter(Boolean)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];

  const walletCdf = wallets.find((w) => w.currency === "CDF");
  const walletUsd = wallets.find((w) => w.currency === "USD");

  const STAT_CARDS = [
    {
      label: "Capital investi",
      value: totalInvested > 0 ? formatAmount(totalInvested.toString(), activeCurrency) : "0,00 " + activeCurrency,
      sub: activeOrAdjudicated.length > 0 ? `${activeOrAdjudicated.length} placement${activeOrAdjudicated.length > 1 ? "s" : ""} actif${activeOrAdjudicated.length > 1 ? "s" : ""}` : "Aucun placement actif",
      icon: BriefcaseIcon,
      accent: "text-primary bg-primary/10 ring-primary/15",
    },
    {
      label: "Souscriptions",
      value: subscriptions.length.toString(),
      sub: `${subscriptions.filter((s) => s.status === "PENDING_PAYMENT").length} en attente de paiement`,
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
      label: "Wallet CDF",
      value: walletCdf ? formatAmount(walletCdf.balance.toString(), "CDF") : "0,00 CDF",
      sub: walletUsd ? `USD : ${formatAmount(walletUsd.balance.toString(), "USD")}` : "Wallet USD vide",
      icon: CreditCardIcon,
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
            Bienvenue sur votre espace investisseur ekonzo.
          </p>
        </div>
        <Button render={<Link href="/products" />} size="lg">
          <PlusIcon className="size-4" weight="bold" />
          Nouveau placement
        </Button>
      </div>

      {kycStatus !== "VERIFIED" && (
        <Alert
          className={cn(
            kycSubmitted
              ? "border-primary/20 bg-primary/5 text-primary"
              : "border-amber-200 bg-amber-50 text-amber-950",
          )}
        >
          {kycSubmitted ? (
            <ClockIcon className="size-4 text-primary" weight="fill" />
          ) : (
            <WarningCircleIcon className="size-4 text-amber-700" weight="fill" />
          )}
          <AlertTitle className={kycSubmitted ? "text-primary" : "text-amber-900"}>
            {kycSubmitted
              ? "Dossier KYC en cours de vérification"
              : "Vérifiez votre identité pour investir"}
          </AlertTitle>
          <AlertDescription
            className={cn(
              "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
              kycSubmitted ? "text-primary/80" : "text-amber-800",
            )}
          >
            <span>
              {kycSubmitted
                ? "Votre dossier a été soumis. Un agent va vérifier vos documents sous 24–48h."
                : "La loi exige la vérification d'identité avant toute souscription. Cela prend moins de 5 minutes."}
            </span>
            {!kycSubmitted && (
              <Button
                render={<Link href="/kyc" />}
                size="sm"
                className="bg-amber-700 text-white hover:bg-amber-800"
              >
                Vérifier maintenant
              </Button>
            )}
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
            {openProducts.map((p) => {
              const days = daysUntil(p.subscriptionDeadline);
              const rate = p.discountRate;
              const committed = committedMap.get(p.id) ?? 0;
              const volumeLeft = calcVolumeLeft(
                p.totalVolume.toString(),
                committed,
              );
              const pct = Math.round((committed / Number(p.totalVolume)) * 100);
              return (
                <Link
                  key={p.id}
                  href={kycStatus === "VERIFIED" ? `/products/${p.id}` : "/kyc"}
                  className="group"
                >
                  <Card className="h-full transition-shadow group-hover:shadow-md ring-1 ring-rdc-navy/5">
                    <CardHeader className="border-b [.border-b]:pb-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="border-primary/20 bg-primary/10 text-primary"
                          >
                            Bon du Trésor
                          </Badge>
                          <span className="text-xs font-mono text-muted-foreground">
                            {p.code}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            days <= 3
                              ? "border-destructive/20 bg-destructive/10 text-destructive"
                              : "border-border bg-muted text-muted-foreground",
                          )}
                        >
                          {days <= 3 ? `${days}j` : `${days}j restants`}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Taux d&apos;escompte</p>
                          <p className="text-2xl font-bold text-primary">
                            {rate ? `${(Number(rate) * 100).toFixed(2)} %` : "—"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Ticket mini</p>
                          <p className="text-sm font-semibold">
                            {formatAmount(p.minTicket.toString(), p.currency)}
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Maturité : {formatDate(p.maturityDate)}</span>
                        <span>{p.currency}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary/60"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {formatAmount(volumeLeft.toString(), p.currency)} disponible
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
