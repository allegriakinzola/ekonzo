"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { InstrumentType } from "@prisma/client";
import {
  BankIcon,
  CheckCircleIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  ReceiptIcon,
  SealCheckIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";

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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/page-header";
import { InfoList, InfoRow } from "@/components/info-list";
import { Avatar, BankLogo, EmptyState, StatCard } from "@/components/data-display";
import {
  InstrumentBadge,
  PAID_STATUSES,
  SubscriptionStatusBadge,
  paymentChannelLabel,
} from "@/components/status-badges";
import { formatAmount, formatDate } from "@/lib/format";
import {
  INSTRUMENT_LABELS,
  INSTRUMENT_SHORT,
  formatRatePercent,
  isObligation,
  resolveInstrument,
} from "@/modules/products/product.model";

export interface AdminSubscription {
  id: string;
  amount: string;
  settlementAmount: string | null;
  currency: string;
  units: number;
  paymentChannel: string;
  paymentRef: string | null;
  status: string;
  adjudicatedAmount: string | null;
  adjudicatedRate: string | null;
  adjudicatedAt: string | null;
  createdAt: string;
  user: {
    name: string;
    email: string;
    phoneNumber: string | null;
    linkedBank: {
      shortName: string;
      logoUrl: string | null;
      accountNumber: string;
    } | null;
  };
  product: {
    code: string;
    type: string;
    currency: string;
    instrumentType: string | null;
    isin: string | null;
    lineLabel: string | null;
    announcedRate: string | null;
    maturityDate: string;
  };
  bankAccount: { bankName: string; accountNumber: string } | null;
  paymentSession: {
    status: string;
    method: string;
    momoPhone: string | null;
    notifyRef: string | null;
    paidAt: string | null;
    accountNumber: string;
    bank: { name: string; shortName: string; logoUrl: string | null };
  } | null;
}

/**
 * Logique métier : dès que la banque confirme le paiement, la souscription
 * est validée — elle vaut soumission et adjudication au taux annoncé.
 * Il n'y a donc que deux états utiles : paiement attendu / payée.
 */
const FILTER_TABS = [
  { value: "ALL", label: "Toutes" },
  { value: "PENDING", label: "Paiement attendu" },
  { value: "PAID", label: "Payées · validées" },
] as const;

const isPaid = (status: string) =>
  (PAID_STATUSES as readonly string[]).includes(status);

function paymentMethodLabel(s: AdminSubscription) {
  if (s.paymentSession?.method === "MOBILE_MONEY") return "Mobile Money";
  return paymentChannelLabel(s.paymentChannel);
}

function maskAccount(acc: string | null | undefined) {
  if (!acc) return "—";
  return acc.length > 4 ? `•••• ${acc.slice(-4)}` : acc;
}

function resolve(s: AdminSubscription) {
  return resolveInstrument({
    instrumentType: s.product.instrumentType as InstrumentType | null,
    type: s.product.type as "BT" | "OT",
    currency: s.product.currency as "CDF" | "USD",
  });
}

export function SubscriptionsManager({
  initial,
}: {
  initial: AdminSubscription[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>("ALL");
  const [query, setQuery] = useState("");
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<AdminSubscription | null>(null);

  const stats = useMemo(() => {
    const paid = initial.filter((s) => isPaid(s.status));
    const pending = initial.filter((s) => s.status === "PENDING_PAYMENT");
    const sum = (rows: AdminSubscription[], cur: string) =>
      rows
        .filter((s) => s.currency === cur)
        .reduce((acc, s) => acc + Number(s.amount), 0);
    return {
      total: initial.length,
      paid: paid.length,
      pending: pending.length,
      paidCdf: sum(paid, "CDF"),
      paidUsd: sum(paid, "USD"),
      pendingCdf: sum(pending, "CDF"),
      pendingUsd: sum(pending, "USD"),
    };
  }, [initial]);

  const displayed = useMemo(() => {
    let rows = initial;
    if (filter === "PENDING") rows = rows.filter((s) => s.status === "PENDING_PAYMENT");
    if (filter === "PAID") rows = rows.filter((s) => isPaid(s.status));
    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter((s) =>
        [
          s.user.name,
          s.user.email,
          s.product.code,
          s.product.isin ?? "",
          s.product.lineLabel ?? "",
          s.paymentSession?.bank.shortName ?? "",
          s.paymentRef ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }
    return rows;
  }, [initial, filter, query]);

  async function doAction(id: string, action: string) {
    setActing(id);
    setError("");
    const res = await fetch(`/api/admin/subscriptions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setActing(null);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Action impossible");
      return;
    }
    setSelected(null);
    router.refresh();
  }

  const selectedInstrument = selected ? resolve(selected) : null;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Opérations"
        icon={<ReceiptIcon className="size-4" weight="duotone" />}
        title="Souscriptions"
        description="Demandes des investisseurs sur les Bons et Obligations du Trésor. Le règlement est effectué auprès de la banque partenaire ; dès confirmation du paiement, la souscription est validée au taux annoncé par le Ministère."
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Souscriptions"
          value={stats.total}
          sub="Demandes enregistrées"
          icon={<ReceiptIcon className="size-5" weight="duotone" />}
          accent="text-rdc-navy bg-rdc-navy/10 ring-rdc-navy/15"
        />
        <StatCard
          label="Payées · validées"
          value={stats.paid}
          sub={`${formatAmount(stats.paidCdf, "CDF")} · ${formatAmount(stats.paidUsd, "USD")}`}
          icon={<SealCheckIcon className="size-5" weight="duotone" />}
          accent="text-emerald-700 bg-emerald-50 ring-emerald-100"
        />
        <StatCard
          label="Paiement attendu"
          value={stats.pending}
          sub={`${formatAmount(stats.pendingCdf, "CDF")} · ${formatAmount(stats.pendingUsd, "USD")}`}
          icon={<ClockIcon className="size-5" weight="duotone" />}
          accent="text-amber-700 bg-amber-50 ring-amber-100"
        />
        <StatCard
          label="Taux de règlement"
          value={
            stats.total > 0 ? `${Math.round((stats.paid / stats.total) * 100)} %` : "—"
          }
          sub="Souscriptions réglées par la banque"
          icon={<BankIcon className="size-5" weight="duotone" />}
        />
      </section>

      <Card className="border-border/80 bg-card shadow-sm ring-1 ring-rdc-navy/5">
        <CardHeader className="border-b [.border-b]:pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-base">Dossiers</CardTitle>
              <CardDescription>
                {displayed.length} dossier{displayed.length > 1 ? "s" : ""} affiché
                {displayed.length > 1 ? "s" : ""}
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Investisseur, ISIN, banque, réf."
                  className="h-9 w-full pl-8 sm:w-64"
                />
              </div>
              <Tabs
                value={filter}
                onValueChange={(value) => {
                  if (typeof value === "string") setFilter(value);
                }}
              >
                <TabsList className="h-9 w-full lg:w-auto">
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
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {displayed.length === 0 ? (
            <EmptyState
              icon={<ReceiptIcon className="size-6" weight="duotone" />}
              title="Aucune souscription"
              description={
                query
                  ? "Aucun dossier ne correspond à votre recherche."
                  : "Les nouvelles demandes apparaîtront ici."
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="px-4">Investisseur</TableHead>
                  <TableHead className="px-4">Émission</TableHead>
                  <TableHead className="px-4">Montant</TableHead>
                  <TableHead className="px-4">Banque · règlement</TableHead>
                  <TableHead className="px-4">Statut</TableHead>
                  <TableHead className="px-4">Date</TableHead>
                  <TableHead className="px-4 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayed.map((s) => {
                  const instrument = resolve(s);
                  const bank = s.paymentSession?.bank ?? s.user.linkedBank;
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={s.user.name} size="sm" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{s.user.name}</p>
                            <p className="max-w-[200px] truncate text-xs text-muted-foreground">
                              {s.user.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <InstrumentBadge
                            short={INSTRUMENT_SHORT[instrument]}
                            isObligation={isObligation(instrument)}
                          />
                          <span className="text-xs font-medium text-primary">
                            {formatRatePercent(s.product.announcedRate)}
                          </span>
                        </div>
                        <p className="mt-1 max-w-[200px] truncate text-xs text-muted-foreground">
                          {s.product.lineLabel ?? s.product.code}
                        </p>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <p className="text-sm font-semibold">
                          {formatAmount(s.amount, s.currency)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {s.units} titre{s.units > 1 ? "s" : ""}
                          {s.settlementAmount &&
                            ` · réglé ${formatAmount(s.settlementAmount, s.currency)}`}
                        </p>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        {bank ? (
                          <div className="flex items-center gap-2">
                            <BankLogo logoUrl={bank.logoUrl} shortName={bank.shortName} size="sm" />
                            <div className="leading-tight">
                              <p className="text-sm font-medium">{bank.shortName}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {paymentMethodLabel(s)}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {paymentMethodLabel(s)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <SubscriptionStatusBadge status={s.status} />
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
                            setError("");
                          }}
                        >
                          Détails
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl" showCloseButton>
          {selected && selectedInstrument && (
            <>
              <DialogHeader className="border-b border-border pb-4 pr-8">
                <div className="flex items-center gap-3">
                  <Avatar name={selected.user.name} />
                  <div className="min-w-0">
                    <DialogTitle className="truncate text-base text-rdc-navy">
                      {selected.user.name}
                    </DialogTitle>
                    <DialogDescription className="truncate">
                      {selected.user.email}
                      {selected.user.phoneNumber ? ` · ${selected.user.phoneNumber}` : ""}
                    </DialogDescription>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <SubscriptionStatusBadge status={selected.status} />
                  <InstrumentBadge
                    short={INSTRUMENT_SHORT[selectedInstrument]}
                    isObligation={isObligation(selectedInstrument)}
                  />
                  <span className="text-xs text-muted-foreground">
                    Souscrit le {formatDate(selected.createdAt)}
                  </span>
                </div>
              </DialogHeader>

              <div className="space-y-5">
                <section>
                  <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Émission
                  </h3>
                  <InfoList>
                    <InfoRow label="Instrument" value={INSTRUMENT_LABELS[selectedInstrument]} />
                    <InfoRow
                      label="Ligne"
                      value={selected.product.lineLabel ?? selected.product.code}
                    />
                    <InfoRow label="ISIN" value={selected.product.isin ?? "—"} mono />
                    <InfoRow
                      label="Taux annoncé"
                      value={
                        <span className="font-semibold text-primary">
                          {formatRatePercent(selected.product.announcedRate)}
                        </span>
                      }
                    />
                    <InfoRow label="Échéance" value={formatDate(selected.product.maturityDate)} />
                  </InfoList>
                </section>

                <section>
                  <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Montants
                  </h3>
                  <InfoList>
                    <InfoRow
                      label="Titres"
                      value={`${selected.units} titre${selected.units > 1 ? "s" : ""}`}
                    />
                    <InfoRow
                      label="Nominal souscrit"
                      value={formatAmount(selected.amount, selected.currency)}
                    />
                    <InfoRow
                      label="Montant réglé"
                      value={
                        selected.settlementAmount
                          ? formatAmount(selected.settlementAmount, selected.currency)
                          : "—"
                      }
                    />
                  </InfoList>
                </section>

                <section>
                  <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Règlement bancaire
                  </h3>
                  {selected.paymentSession ? (
                    <InfoList>
                      <InfoRow
                        label="Banque"
                        value={
                          <span className="inline-flex items-center gap-2">
                            <BankLogo
                              logoUrl={selected.paymentSession.bank.logoUrl}
                              shortName={selected.paymentSession.bank.shortName}
                              size="sm"
                            />
                            {selected.paymentSession.bank.name}
                          </span>
                        }
                      />
                      <InfoRow
                        label="Moyen"
                        value={
                          selected.paymentSession.method === "MOBILE_MONEY"
                            ? `Mobile Money${selected.paymentSession.momoPhone ? ` · ${selected.paymentSession.momoPhone}` : ""}`
                            : `Compte bancaire · ${maskAccount(selected.paymentSession.accountNumber)}`
                        }
                      />
                      <InfoRow
                        label="Statut banque"
                        value={
                          {
                            PENDING: "En attente",
                            PAID: "Payé",
                            FAILED: "Échoué",
                            EXPIRED: "Expiré",
                          }[selected.paymentSession.status] ?? selected.paymentSession.status
                        }
                      />
                      <InfoRow
                        label="Payé le"
                        value={
                          selected.paymentSession.paidAt
                            ? formatDate(selected.paymentSession.paidAt)
                            : "—"
                        }
                        muted={!selected.paymentSession.paidAt}
                      />
                      <InfoRow label="Réf. ekonzo" value={selected.paymentRef ?? "—"} mono />
                      <InfoRow
                        label="Réf. banque"
                        value={selected.paymentSession.notifyRef ?? "—"}
                        mono
                        muted={!selected.paymentSession.notifyRef}
                      />
                    </InfoList>
                  ) : (
                    <InfoList>
                      <InfoRow label="Canal" value={paymentChannelLabel(selected.paymentChannel)} />
                      <InfoRow
                        label="Banque"
                        value={
                          selected.bankAccount
                            ? `${selected.bankAccount.bankName} · ${maskAccount(selected.bankAccount.accountNumber)}`
                            : selected.user.linkedBank
                              ? `${selected.user.linkedBank.shortName} · ${maskAccount(selected.user.linkedBank.accountNumber)}`
                              : "—"
                        }
                      />
                    </InfoList>
                  )}
                </section>

                {error && (
                  <p className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                    <WarningCircleIcon className="mt-0.5 size-3.5 shrink-0" />
                    {error}
                  </p>
                )}

                {selected.status === "PENDING_PAYMENT" ? (
                  <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">
                      Paiement attendu
                    </p>
                    <p className="text-xs text-muted-foreground">
                      La souscription sera validée automatiquement à la notification de la
                      banque. Si la banque confirme le règlement hors ligne, vous pouvez la
                      valider manuellement. L&apos;annulation retire la demande non réglée.
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        className="flex-1"
                        disabled={acting === selected.id}
                        onClick={() => doAction(selected.id, "confirm_payment")}
                      >
                        <CheckCircleIcon weight="bold" />
                        {acting === selected.id ? "…" : "Valider (paiement reçu)"}
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                        disabled={acting === selected.id}
                        onClick={() => doAction(selected.id, "cancel")}
                      >
                        {acting === selected.id ? "…" : "Annuler la demande"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                    <SealCheckIcon className="mt-0.5 size-5 shrink-0 text-emerald-700" weight="duotone" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-800">
                        Souscription validée
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Le paiement a été confirmé par la banque : la souscription est soumise
                        et servie au taux annoncé par le Ministère. Aucune action requise.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
