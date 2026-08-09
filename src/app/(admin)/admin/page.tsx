import Link from "next/link";
import {
  CreditCardIcon,
  IdentificationCardIcon,
  ListBulletsIcon,
  UsersThreeIcon,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatAmount, formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export default async function AdminOverviewPage() {
  const [
    kycPending,
    kycTotal,
    usersTotal,
    openProducts,
    pendingPayment,
    recentSubs,
  ] = await Promise.all([
    prisma.kYC.count({ where: { status: "SUBMITTED" } }),
    prisma.kYC.count(),
    prisma.user.count({ where: { role: "CLIENT" } }),
    prisma.product.count({ where: { status: "OPEN" } }),
    prisma.subscription.count({ where: { status: "PENDING_PAYMENT" } }),
    prisma.subscription.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, phoneNumber: true } },
        product: { select: { code: true, type: true, currency: true } },
      },
    }),
  ]);

  const STATS = [
    {
      label: "KYC en attente",
      value: kycPending,
      sub: `${kycTotal} dossiers au total`,
      href: "/admin/kyc",
      icon: IdentificationCardIcon,
      accent: "text-amber-700 bg-amber-50 ring-amber-100",
    },
    {
      label: "Utilisateurs (clients)",
      value: usersTotal,
      sub: "Comptes actifs",
      href: "/admin/users",
      icon: UsersThreeIcon,
      accent: "text-primary bg-primary/10 ring-primary/15",
    },
    {
      label: "Produits ouverts",
      value: openProducts,
      sub: "Disponibles à la souscription",
      href: "/admin/products",
      icon: ListBulletsIcon,
      accent: "text-emerald-700 bg-emerald-50 ring-emerald-100",
    },
    {
      label: "Paiements en attente",
      value: pendingPayment,
      sub: "À confirmer",
      href: "/admin/subscriptions",
      icon: CreditCardIcon,
      accent: "text-rdc-navy bg-rdc-navy/10 ring-rdc-navy/15",
    },
  ];

  const SUB_STATUS: Record<string, string> = {
    PENDING_PAYMENT: "border-amber-200 bg-amber-50 text-amber-800",
    PAYMENT_CONFIRMED: "border-primary/20 bg-primary/10 text-primary",
    SUBMITTED: "border-rdc-navy/20 bg-rdc-navy/10 text-rdc-navy",
    ADJUDICATED: "border-emerald-200 bg-emerald-50 text-emerald-700",
    ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
    CANCELLED: "border-destructive/20 bg-destructive/10 text-destructive",
    FAILED: "border-destructive/20 bg-destructive/10 text-destructive",
    REIMBURSED: "border-border bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-primary">
          Administration
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-rdc-navy">
          Vue d&apos;ensemble
        </h1>
        <p className="text-sm text-muted-foreground">
          Tableau de bord de l&apos;administration ekonzo
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STATS.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.label} href={s.href} className="group">
              <Card className="h-full transition-shadow group-hover:shadow-md ring-1 ring-rdc-navy/5">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <CardDescription className="text-[11px] font-medium uppercase tracking-wide">
                      {s.label}
                    </CardDescription>
                    <span
                      className={cn(
                        "inline-flex size-9 items-center justify-center rounded-lg ring-1",
                        s.accent,
                      )}
                    >
                      <Icon className="size-4" weight="duotone" />
                    </span>
                  </div>
                  <CardTitle className="text-3xl font-bold tracking-tight">
                    {s.value}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{s.sub}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {kycPending > 0 && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-950">
          <WarningCircleIcon className="size-4 text-amber-700" weight="fill" />
          <AlertTitle className="text-amber-900">
            {kycPending} dossier{kycPending > 1 ? "s" : ""} KYC en attente
          </AlertTitle>
          <AlertDescription className="flex flex-col gap-3 text-amber-800 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Traitez les dossiers pour permettre aux utilisateurs d&apos;investir.
            </span>
            <Button
              render={<Link href="/admin/kyc" />}
              size="sm"
              className="bg-amber-700 text-white hover:bg-amber-800"
            >
              Traiter
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card className="ring-1 ring-rdc-navy/5">
        <CardHeader className="border-b [.border-b]:pb-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Souscriptions récentes</CardTitle>
              <CardDescription>
                Dernières demandes de souscription aux Bons du Trésor
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
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              Aucune souscription pour le moment.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="px-4">Investisseur</TableHead>
                  <TableHead className="px-4">Produit</TableHead>
                  <TableHead className="px-4">Montant</TableHead>
                  <TableHead className="px-4">Statut</TableHead>
                  <TableHead className="px-4">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSubs.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="px-4 py-3 whitespace-normal">
                      <p className="text-sm font-medium">{s.user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.user.phoneNumber}
                      </p>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className="mr-1 border-primary/20 bg-primary/10 text-primary"
                      >
                        BT
                      </Badge>
                      <span className="font-mono text-xs">{s.product.code}</span>
                    </TableCell>
                    <TableCell className="px-4 py-3 font-medium">
                      {formatAmount(s.amount.toString(), s.product.currency)}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          "",
                          SUB_STATUS[s.status] ??
                            "border-border bg-muted text-muted-foreground",
                        )}
                      >
                        {s.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-muted-foreground">
                      {formatDate(s.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
