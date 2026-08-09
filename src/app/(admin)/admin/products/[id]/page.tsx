import { notFound } from "next/navigation";
import Link from "next/link";
import { ChartBarIcon } from "@phosphor-icons/react/dist/ssr";

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
import { ProductDetailActions } from "./ProductDetailActions";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  OPEN: "Ouvert",
  CLOSED: "Clôturé",
  ADJUDICATED: "Adjugé",
  ACTIVE: "Actif",
  MATURED: "Échu",
};

const STATUS_TRANSITIONS: Record<string, string> = {
  DRAFT: "OPEN",
  OPEN: "CLOSED",
  CLOSED: "ADJUDICATED",
  ADJUDICATED: "ACTIVE",
  ACTIVE: "MATURED",
};

const SUB_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Paiement attendu",
  PAYMENT_CONFIRMED: "Paiement confirmé",
  SUBMITTED: "Soumis",
  ADJUDICATED: "Adjugé",
  ACTIVE: "Actif",
  CANCELLED: "Annulé",
  FAILED: "Échoué",
  REIMBURSED: "Remboursé",
};

function productStatusClass(status: string) {
  switch (status) {
    case "OPEN":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "CLOSED":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "ADJUDICATED":
      return "border-primary/20 bg-primary/10 text-primary";
    case "ACTIVE":
      return "border-rdc-navy/20 bg-rdc-navy/10 text-rdc-navy";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

function subStatusClass(status: string) {
  switch (status) {
    case "ADJUDICATED":
    case "ACTIVE":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "PAYMENT_CONFIRMED":
      return "border-primary/20 bg-primary/10 text-primary";
    case "SUBMITTED":
      return "border-rdc-navy/20 bg-rdc-navy/10 text-rdc-navy";
    case "PENDING_PAYMENT":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "CANCELLED":
    case "FAILED":
      return "border-destructive/20 bg-destructive/10 text-destructive";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

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
          user: { select: { name: true, phoneNumber: true } },
          momoAccount: { select: { operator: true, phoneNumber: true } },
          bankAccount: { select: { bankName: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!product) notFound();

  const volumeLeft =
    Number(product.totalVolume) - Number(product.allocatedVolume);
  const pct = Math.round(
    (Number(product.allocatedVolume) / Number(product.totalVolume)) * 100,
  );
  const nextStatus = STATUS_TRANSITIONS[product.status];

  const totalAmount = product.subscriptions.reduce(
    (sum, s) => sum + Number(s.amount),
    0,
  );
  const confirmedAmount = product.subscriptions
    .filter((s) =>
      ["PAYMENT_CONFIRMED", "SUBMITTED", "ADJUDICATED", "ACTIVE"].includes(
        s.status,
      ),
    )
    .reduce((sum, s) => sum + Number(s.amount), 0);

  const INFO_GRID = [
    ["Code", product.code],
    ["Devise", product.currency],
    [
      "Montant total annoncé",
      formatAmount(product.totalVolume.toString(), product.currency),
    ],
    [
      "Ticket minimum",
      formatAmount(product.minTicket.toString(), product.currency),
    ],
    [
      "Taux d'escompte",
      product.discountRate
        ? `${(Number(product.discountRate) * 100).toFixed(2)} %`
        : "—",
    ],
    [
      "Volume alloué",
      formatAmount(product.allocatedVolume.toString(), product.currency),
    ],
    ["Date d'émission", formatDate(product.issuanceDate)],
    ["Clôture souscription", formatDate(product.subscriptionDeadline)],
    ["Date d'adjudication", formatDate(product.adjudicationDate)],
    ["Date de maturité", formatDate(product.maturityDate)],
    ["Créé le", formatDate(product.createdAt)],
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0"
          render={<Link href="/admin/products" />}
        >
          Produits
        </Button>
        <span>/</span>
        <span className="font-medium text-foreground">{product.code}</span>
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-2 text-primary">
          <ChartBarIcon className="size-5" weight="duotone" />
          <span className="text-xs font-medium uppercase tracking-wide">
            Fiche produit
          </span>
        </div>
      </div>

      <Card className="overflow-hidden ring-1 ring-rdc-navy/5">
        <CardHeader className="border-b bg-muted/30 [.border-b]:pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-primary/20 bg-primary/10 text-primary"
                >
                  Bon du Trésor
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(productStatusClass(product.status))}
                >
                  {STATUS_LABELS[product.status] ?? product.status}
                </Badge>
              </div>
              <CardTitle className="text-2xl text-rdc-navy">
                {product.code}
              </CardTitle>
              <CardDescription>
                Émis le {formatDate(product.issuanceDate)} · Maturité le{" "}
                {formatDate(product.maturityDate)}
              </CardDescription>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs text-muted-foreground">Taux d&apos;escompte</p>
              <p className="text-3xl font-bold text-primary">
                {product.discountRate
                  ? `${(Number(product.discountRate) * 100).toFixed(2)} %`
                  : "—"}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 pt-5">
          <div>
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Volume souscrit</span>
              <span className="font-semibold">
                {pct}% ·{" "}
                {formatAmount(
                  product.allocatedVolume.toString(),
                  product.currency,
                )}{" "}
                /{" "}
                {formatAmount(product.totalVolume.toString(), product.currency)}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {formatAmount(volumeLeft.toString(), product.currency)} disponible
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {INFO_GRID.map(([label, value]) => (
              <div
                key={label}
                className="rounded-lg border border-border bg-muted/50 px-3 py-2.5"
              >
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {label}
                </p>
                <p className="mt-0.5 text-sm font-semibold">{value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {nextStatus && (
        <ProductDetailActions
          productId={product.id}
          currentStatus={product.status}
          nextStatus={nextStatus}
          nextLabel={STATUS_LABELS[nextStatus]}
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            label: "Total souscriptions",
            value: product.subscriptions.length.toString(),
            accent: "text-rdc-navy",
          },
          {
            label: "Montant total souscrit",
            value: formatAmount(totalAmount.toString(), product.currency),
            accent: "text-primary",
          },
          {
            label: "Montant confirmé",
            value: formatAmount(confirmedAmount.toString(), product.currency),
            accent: "text-emerald-700",
          },
        ].map((s) => (
          <Card key={s.label} className="ring-1 ring-rdc-navy/5">
            <CardHeader className="pb-2">
              <CardDescription className="text-[11px] font-medium uppercase tracking-wide">
                {s.label}
              </CardDescription>
              <CardTitle className={cn("text-xl font-bold", s.accent)}>
                {s.value}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card className="ring-1 ring-rdc-navy/5">
        <CardHeader className="border-b [.border-b]:pb-4">
          <CardTitle className="text-base">
            Souscriptions ({product.subscriptions.length})
          </CardTitle>
          <CardDescription>
            Demandes liées à cette émission
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {product.subscriptions.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              Aucune souscription sur ce produit.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="px-4">Investisseur</TableHead>
                  <TableHead className="px-4">Montant</TableHead>
                  <TableHead className="px-4">Canal</TableHead>
                  <TableHead className="px-4">Statut</TableHead>
                  <TableHead className="px-4">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {product.subscriptions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="px-4 py-3 whitespace-normal">
                      <p className="text-sm font-medium">{s.user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.user.phoneNumber}
                      </p>
                    </TableCell>
                    <TableCell className="px-4 py-3 font-medium">
                      {formatAmount(s.amount.toString(), product.currency)}
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-normal text-muted-foreground">
                      {s.paymentChannel === "MOBILE_MONEY"
                        ? `${s.momoAccount?.operator ?? "MoMo"} · ${s.momoAccount?.phoneNumber ?? ""}`
                        : `Virement · ${s.bankAccount?.bankName ?? ""}`}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={cn(subStatusClass(s.status))}
                      >
                        {SUB_LABELS[s.status] ?? s.status}
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
