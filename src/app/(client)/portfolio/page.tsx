import Link from "next/link";
import {
  BriefcaseIcon,
  ChartLineUpIcon,
  PlusIcon,
} from "@phosphor-icons/react/dist/ssr";

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
import { requireRole } from "@/lib/session";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "En attente de paiement",
  PAYMENT_CONFIRMED: "Paiement confirmé",
  SUBMITTED: "Soumis",
  ADJUDICATED: "Adjugé",
  PARTIALLY_ADJUDICATED: "Partiellement adjugé",
  ACTIVE: "Actif",
  REIMBURSED: "Remboursé",
  CANCELLED: "Annulé",
  FAILED: "Échoué",
};

function statusBadgeClass(status: string) {
  switch (status) {
    case "ADJUDICATED":
    case "ACTIVE":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "PAYMENT_CONFIRMED":
      return "border-primary/20 bg-primary/10 text-primary";
    case "SUBMITTED":
      return "border-rdc-navy/20 bg-rdc-navy/10 text-rdc-navy";
    case "PENDING_PAYMENT":
    case "PARTIALLY_ADJUDICATED":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "CANCELLED":
    case "FAILED":
      return "border-destructive/20 bg-destructive/10 text-destructive";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

export default async function PortfolioPage() {
  const session = await requireRole("CLIENT");

  const subscriptions = await prisma.subscription.findMany({
    where: { userId: session.user.id },
    include: {
      product: {
        select: {
          code: true,
          type: true,
          currency: true,
          maturityDate: true,
          discountRate: true,
          couponRate: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const activeSubscriptions = subscriptions.filter((s) =>
    [
      "ACTIVE",
      "ADJUDICATED",
      "PARTIALLY_ADJUDICATED",
      "PAYMENT_CONFIRMED",
      "SUBMITTED",
    ].includes(s.status),
  );
  const totalInvestedUSD = activeSubscriptions
    .filter((s) => s.currency === "USD")
    .reduce((acc, s) => acc + Number(s.adjudicatedAmount ?? s.amount), 0);
  const totalInvestedCDF = activeSubscriptions
    .filter((s) => s.currency === "CDF")
    .reduce((acc, s) => acc + Number(s.adjudicatedAmount ?? s.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <BriefcaseIcon className="size-5" weight="duotone" />
            <span className="text-xs font-medium uppercase tracking-wide">
              Placements
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-rdc-navy">
            Mon portefeuille
          </h1>
          <p className="text-sm text-muted-foreground">
            Suivi de vos souscriptions aux Bons du Trésor
          </p>
        </div>
        <Button render={<Link href="/products" />} size="lg">
          <PlusIcon className="size-4" weight="bold" />
          Nouvelle souscription
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="ring-1 ring-rdc-navy/5">
          <CardHeader className="pb-2">
            <CardDescription className="text-[11px] font-medium uppercase tracking-wide">
              Capital investi (USD)
            </CardDescription>
            <CardTitle className="text-2xl font-bold tracking-tight">
              {formatAmount(totalInvestedUSD.toString(), "USD")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {
                activeSubscriptions.filter((s) => s.currency === "USD").length
              }{" "}
              placement(s) actif(s)
            </p>
          </CardContent>
        </Card>
        <Card className="ring-1 ring-rdc-navy/5">
          <CardHeader className="pb-2">
            <CardDescription className="text-[11px] font-medium uppercase tracking-wide">
              Capital investi (CDF)
            </CardDescription>
            <CardTitle className="text-2xl font-bold tracking-tight">
              {formatAmount(totalInvestedCDF.toString(), "CDF")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {
                activeSubscriptions.filter((s) => s.currency === "CDF").length
              }{" "}
              placement(s) actif(s)
            </p>
          </CardContent>
        </Card>
        <Card className="ring-1 ring-rdc-navy/5">
          <CardHeader className="pb-2">
            <CardDescription className="text-[11px] font-medium uppercase tracking-wide">
              Souscriptions
            </CardDescription>
            <CardTitle className="text-2xl font-bold tracking-tight">
              {subscriptions.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {activeSubscriptions.length} active
              {activeSubscriptions.length > 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80 bg-card shadow-sm ring-1 ring-rdc-navy/5">
        <CardHeader className="border-b [.border-b]:pb-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Mes souscriptions</CardTitle>
              <CardDescription>
                Historique et statut de vos placements
              </CardDescription>
            </div>
            <ChartLineUpIcon
              className="size-5 text-muted-foreground"
              weight="duotone"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {subscriptions.length === 0 ? (
            <div className="space-y-4 px-6 py-16 text-center">
              <p className="font-semibold text-base">Aucune souscription</p>
              <p className="text-sm text-muted-foreground">
                Souscrivez à un Bon du Trésor pour commencer à investir.
              </p>
              <Button render={<Link href="/products" />}>
                Voir les produits
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="px-4">Produit</TableHead>
                  <TableHead className="px-4">Montant</TableHead>
                  <TableHead className="px-4">Taux</TableHead>
                  <TableHead className="px-4">Maturité</TableHead>
                  <TableHead className="px-4">Statut</TableHead>
                  <TableHead className="px-4">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((s) => {
                  const rate = s.adjudicatedRate ?? s.product.discountRate;
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className="border-primary/20 bg-primary/10 text-primary"
                          >
                            BT
                          </Badge>
                          <span className="font-mono text-xs">
                            {s.product.code}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 font-medium">
                        {formatAmount(
                          (s.adjudicatedAmount ?? s.amount).toString(),
                          s.currency,
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 font-medium text-primary">
                        {rate ? `${(Number(rate) * 100).toFixed(2)} %` : "—"}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-muted-foreground">
                        {formatDate(s.product.maturityDate)}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={cn(statusBadgeClass(s.status))}
                        >
                          {STATUS_LABELS[s.status] ?? s.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-xs text-muted-foreground">
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
