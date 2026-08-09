"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircleIcon,
  CreditCardIcon,
  ListBulletsIcon,
} from "@phosphor-icons/react";

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatAmount, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Subscription {
  id: string;
  amount: string;
  currency: string;
  units: number;
  paymentChannel: string;
  status: string;
  bankTransferRef: string | null;
  createdAt: string;
  user: { name: string; phoneNumber: string | null };
  product: { code: string; type: string };
  momoAccount: { operator: string; phoneNumber: string } | null;
  bankAccount: { bankName: string; accountNumber: string } | null;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Paiement attendu",
  PAYMENT_CONFIRMED: "Paiement confirmé",
  SUBMITTED: "Soumis",
  ADJUDICATED: "Adjugé",
  PARTIALLY_ADJUDICATED: "Partiellement adjugé",
  ACTIVE: "Actif",
  REIMBURSED: "Remboursé",
  CANCELLED: "Annulé",
  FAILED: "Échoué",
};

const FILTER_TABS = [
  { value: "ALL", label: "Toutes" },
  { value: "PENDING_PAYMENT", label: "En attente" },
  { value: "PAYMENT_CONFIRMED", label: "Paiement confirmé" },
  { value: "SUBMITTED", label: "Soumis" },
  { value: "ADJUDICATED", label: "Adjugés" },
] as const;

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

export function SubscriptionsManager({ initial }: { initial: Subscription[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState("ALL");
  const [acting, setActing] = useState<string | null>(null);
  const [selected, setSelected] = useState<Subscription | null>(null);
  const [adjForm, setAdjForm] = useState({ amount: "", rate: "" });

  const displayed =
    filter === "ALL" ? initial : initial.filter((s) => s.status === filter);

  async function doAction(id: string, action: string, extra?: object) {
    setActing(id);
    await fetch(`/api/admin/subscriptions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    setActing(null);
    setSelected(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <ListBulletsIcon className="size-5" weight="duotone" />
            <span className="text-xs font-medium uppercase tracking-wide">
              Opérations
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-rdc-navy">
            Souscriptions
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestion des dossiers de souscription aux Bons du Trésor
          </p>
        </div>
        <Badge variant="outline" className="h-7 px-3 text-xs">
          {displayed.length} dossier{displayed.length > 1 ? "s" : ""}
        </Badge>
      </div>

      <Card className="border-border/80 bg-card shadow-sm ring-1 ring-rdc-navy/5">
        <CardHeader className="border-b [.border-b]:pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-base">Dossiers</CardTitle>
              <CardDescription>
                Filtrez par statut, puis gérez chaque souscription
              </CardDescription>
            </div>
            <Tabs
              value={filter}
              onValueChange={(value) => {
                if (typeof value === "string") setFilter(value);
              }}
            >
              <TabsList className="h-9 w-full flex-wrap lg:w-auto">
                {FILTER_TABS.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="px-3 data-active:bg-primary data-active:text-primary-foreground"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <CreditCardIcon
                className="size-10 text-primary/50"
                weight="duotone"
              />
              <p className="text-sm font-medium">Aucune souscription</p>
              <p className="text-xs text-muted-foreground">
                Les nouvelles demandes apparaîtront ici.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="px-4">Investisseur</TableHead>
                  <TableHead className="px-4">Produit</TableHead>
                  <TableHead className="px-4">Montant</TableHead>
                  <TableHead className="px-4">Canal</TableHead>
                  <TableHead className="px-4">Statut</TableHead>
                  <TableHead className="px-4">Date</TableHead>
                  <TableHead className="px-4 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayed.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="px-4 py-3 whitespace-normal">
                      <p className="text-sm font-medium">{s.user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.user.phoneNumber ?? "—"}
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
                      {formatAmount(s.amount, s.currency)}
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-normal text-muted-foreground">
                      {s.paymentChannel === "MOBILE_MONEY"
                        ? `${s.momoAccount?.operator ?? "MoMo"} · ${s.momoAccount?.phoneNumber ?? ""}`
                        : `Virement · ${s.bankAccount?.bankName ?? ""}`}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          "",
                          statusBadgeClass(s.status),
                        )}
                      >
                        {STATUS_LABELS[s.status] ?? s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-muted-foreground">
                      {formatDate(s.createdAt)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelected(s);
                          setAdjForm({ amount: s.amount, rate: "" });
                        }}
                      >
                        Gérer
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="sm:max-w-lg" showCloseButton>
          {selected && (
            <>
              <DialogHeader className="border-b border-border pb-4 pr-8">
                <DialogTitle className="text-base text-rdc-navy">
                  {selected.user.name}
                </DialogTitle>
                <DialogDescription>
                  {selected.product.type} · {selected.product.code}
                </DialogDescription>
                <Badge
                  variant="outline"
                  className={cn(
                    "mt-2 w-fit ",
                    statusBadgeClass(selected.status),
                  )}
                >
                  {STATUS_LABELS[selected.status] ?? selected.status}
                </Badge>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      [
                        "Montant",
                        formatAmount(selected.amount, selected.currency),
                      ],
                      [
                        "Canal",
                        selected.paymentChannel === "MOBILE_MONEY"
                          ? "Mobile Money"
                          : "Virement bancaire",
                      ],
                      [
                        "Statut",
                        STATUS_LABELS[selected.status] ?? selected.status,
                      ],
                      ...(selected.momoAccount
                        ? ([
                          ["Opérateur", selected.momoAccount.operator],
                          ["N° MoMo", selected.momoAccount.phoneNumber],
                        ] as const)
                        : []),
                      ...(selected.bankAccount
                        ? ([
                          ["Banque", selected.bankAccount.bankName],
                          ["Compte", selected.bankAccount.accountNumber],
                        ] as const)
                        : []),
                      ...(selected.bankTransferRef
                        ? ([
                          ["Réf. virement", selected.bankTransferRef],
                        ] as const)
                        : []),
                    ] as const
                  ).map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-lg border border-border bg-muted/50 px-3 py-2.5"
                    >
                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {label}
                      </p>
                      <p className="mt-0.5 break-all text-sm font-semibold">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="space-y-2">
                  {selected.status === "PENDING_PAYMENT" && (
                    <Button
                      className="w-full"
                      disabled={acting === selected.id}
                      onClick={() => doAction(selected.id, "confirm_payment")}
                    >
                      <CheckCircleIcon weight="bold" />
                      {acting === selected.id
                        ? "…"
                        : "Confirmer le paiement"}
                    </Button>
                  )}

                  {selected.status === "PAYMENT_CONFIRMED" && (
                    <Button
                      className="w-full bg-rdc-navy text-white hover:bg-rdc-navy/90"
                      disabled={acting === selected.id}
                      onClick={() => doAction(selected.id, "submit")}
                    >
                      {acting === selected.id
                        ? "…"
                        : "Marquer comme soumis"}
                    </Button>
                  )}

                  {selected.status === "SUBMITTED" && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="adj-amount">Montant adjugé</Label>
                          <Input
                            id="adj-amount"
                            type="number"
                            placeholder={selected.amount}
                            value={adjForm.amount}
                            onChange={(e) =>
                              setAdjForm((f) => ({
                                ...f,
                                amount: e.target.value,
                              }))
                            }
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="adj-rate">Taux adjugé (%)</Label>
                          <Input
                            id="adj-rate"
                            type="number"
                            step="0.01"
                            placeholder="12.50"
                            value={adjForm.rate}
                            onChange={(e) =>
                              setAdjForm((f) => ({
                                ...f,
                                rate: e.target.value,
                              }))
                            }
                            className="h-9"
                          />
                        </div>
                      </div>
                      <Button
                        className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
                        disabled={
                          acting === selected.id ||
                          !adjForm.amount ||
                          !adjForm.rate
                        }
                        onClick={() =>
                          doAction(selected.id, "adjudicate", {
                            adjudicatedAmount: parseFloat(adjForm.amount),
                            adjudicatedRate: parseFloat(adjForm.rate) / 100,
                          })
                        }
                      >
                        {acting === selected.id ? "…" : "Adjuger"}
                      </Button>
                    </div>
                  )}

                  {![
                    "CANCELLED",
                    "FAILED",
                    "REIMBURSED",
                    "ADJUDICATED",
                    "ACTIVE",
                    "MATURED",
                  ].includes(selected.status) && (
                      <DialogFooter className="sm:justify-stretch">
                        <Button
                          variant="outline"
                          className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
                          disabled={acting === selected.id}
                          onClick={() => doAction(selected.id, "cancel")}
                        >
                          {acting === selected.id
                            ? "…"
                            : "Annuler la souscription"}
                        </Button>
                      </DialogFooter>
                    )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
