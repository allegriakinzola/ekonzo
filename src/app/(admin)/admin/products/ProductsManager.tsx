"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChartBarIcon,
  ClockIcon,
  PlusIcon,
  StackIcon,
} from "@phosphor-icons/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { EmptyState, StatCard } from "@/components/data-display";
import {
  InstrumentBadge,
  PRODUCT_STATUS_LABELS,
  ProductStatusBadge,
} from "@/components/status-badges";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { daysUntil, formatAmount, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  INSTRUMENT_SHORT,
  faceValueFromInstrument,
  formatRatePercent,
  isObligation,
  minTicketFromInstrument,
  resolveInstrument,
} from "@/modules/products/product.model";
import type { InstrumentType } from "@prisma/client";

interface Product {
  id: string;
  code: string;
  type: string;
  instrumentType: string | null;
  currency: string;
  isin: string | null;
  lineLabel: string | null;
  faceValue: string;
  minTicket: string;
  announcedRate: string | null;
  discountRate: string | null;
  couponRate: string | null;
  interestPeriodsPerYear: number | null;
  principalRepaymentMode: string | null;
  issuanceDate: string;
  maturityDate: string;
  adjudicationDate: string;
  subscriptionDeadline: string;
  resultsDate: string | null;
  settlementDate: string | null;
  totalVolume: string;
  allocatedVolume: string;
  status: string;
  createdAt: string;
  _count: { subscriptions: number };
}

const STATUS_LABELS = PRODUCT_STATUS_LABELS;

const STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["OPEN"],
  OPEN: ["CLOSED"],
  CLOSED: ["ADJUDICATED"],
  ADJUDICATED: ["ACTIVE"],
  ACTIVE: ["MATURED"],
  MATURED: [],
};

const INSTRUMENTS: InstrumentType[] = ["BTI", "BT_USD", "OTI", "OT_USD"];

const emptyForm = {
  instrumentType: "BTI" as InstrumentType,
  isin: "",
  lineLabel: "",
  code: "",
  announcedRatePercent: "",
  totalVolume: "",
  issuanceDate: "",
  maturityDate: "",
  adjudicationDate: "",
  subscriptionDeadline: "",
  resultsDate: "",
  settlementDate: "",
  interestPeriodsPerYear: "4",
  principalRepaymentMode: "SEMI_ANNUAL" as
    | "AT_MATURITY"
    | "SEMI_ANNUAL"
    | "ANNUAL",
};

export function ProductsManager({ initial }: { initial: Product[] }) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);

  const isOt =
    form.instrumentType === "OTI" || form.instrumentType === "OT_USD";
  const face = faceValueFromInstrument(form.instrumentType);
  const minTicket = minTicketFromInstrument(form.instrumentType);
  const currency =
    form.instrumentType === "BTI" || form.instrumentType === "OTI"
      ? "CDF"
      : "USD";

  function field<K extends keyof typeof emptyForm>(
    key: K,
    value: (typeof emptyForm)[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body = {
        instrumentType: form.instrumentType,
        isin: form.isin,
        lineLabel: form.lineLabel,
        code: form.code || undefined,
        announcedRatePercent: parseFloat(form.announcedRatePercent),
        totalVolume: parseFloat(form.totalVolume),
        issuanceDate: form.issuanceDate,
        maturityDate: form.maturityDate,
        adjudicationDate: form.adjudicationDate,
        subscriptionDeadline: form.subscriptionDeadline,
        resultsDate: form.resultsDate || undefined,
        settlementDate: form.settlementDate || undefined,
        interestPeriodsPerYear: isOt
          ? parseInt(form.interestPeriodsPerYear, 10)
          : undefined,
        principalRepaymentMode: isOt
          ? form.principalRepaymentMode
          : undefined,
        publish: true,
      };
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Création impossible");
      setShowCreate(false);
      setForm(emptyForm);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatus(productId: string, status: string) {
    const res = await fetch(`/api/admin/products/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) router.refresh();
  }

  const rows = useMemo(() => initial, [initial]);
  const openCount = rows.filter((p) => p.status === "OPEN").length;
  const btCount = rows.filter((p) => p.type === "BT").length;
  const otCount = rows.length - btCount;
  const totalSubs = rows.reduce((sum, p) => sum + p._count.subscriptions, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Ministère des Finances"
        icon={<ChartBarIcon className="size-4" weight="duotone" />}
        title="Émissions"
        description="Annonces d'adjudication des Bons (BTI, BT USD) et Obligations du Trésor (OTI, OT USD), avec le taux annoncé par le Ministère. Nominal et minimum (10 titres) sont fixés automatiquement."
        actions={
          <Button
            onClick={() => {
              setForm(emptyForm);
              setError("");
              setShowCreate(true);
            }}
          >
            <PlusIcon weight="bold" />
            Nouvelle annonce
          </Button>
        }
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Émissions ouvertes"
          value={openCount}
          sub={`${rows.length} annonce${rows.length > 1 ? "s" : ""} au total`}
          icon={<ClockIcon className="size-5" weight="duotone" />}
          accent="text-emerald-700 bg-emerald-50 ring-emerald-100"
        />
        <StatCard
          label="Bons · Obligations"
          value={`${btCount} · ${otCount}`}
          sub="BT (précompte) · OT (intérêts périodiques)"
          icon={<StackIcon className="size-5" weight="duotone" />}
          accent="text-rdc-navy bg-rdc-navy/10 ring-rdc-navy/15"
        />
        <StatCard
          label="Souscriptions"
          value={totalSubs}
          sub="Toutes émissions, hors abandonnées"
          icon={<ChartBarIcon className="size-5" weight="duotone" />}
        />
      </section>

      <Card className="border-border/80 bg-card shadow-sm ring-1 ring-rdc-navy/5">
        <CardHeader className="border-b [.border-b]:pb-4">
          <CardTitle className="text-base">Catalogue</CardTitle>
          <CardDescription>
            Cliquez une ligne pour ouvrir la fiche de l&apos;émission
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <EmptyState
              icon={<ChartBarIcon className="size-6" weight="duotone" />}
              title="Aucune émission"
              description="Publiez la première annonce d'adjudication du Ministère."
              action={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setForm(emptyForm);
                    setError("");
                    setShowCreate(true);
                  }}
                >
                  <PlusIcon weight="bold" />
                  Nouvelle annonce
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="px-4">Émission</TableHead>
                  <TableHead className="px-4">Montant annoncé</TableHead>
                  <TableHead className="px-4">Taux annoncé</TableHead>
                  <TableHead className="px-4">Clôture</TableHead>
                  <TableHead className="px-4 text-right">Souscr.</TableHead>
                  <TableHead className="px-4">Statut</TableHead>
                  <TableHead className="px-4 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => {
                  const instrument = resolveInstrument({
                    instrumentType: p.instrumentType as InstrumentType | null,
                    type: p.type as "BT" | "OT",
                    currency: p.currency as "CDF" | "USD",
                  });
                  const rate =
                    p.announcedRate ?? p.discountRate ?? p.couponRate;
                  const next = STATUS_TRANSITIONS[p.status]?.[0];
                  const days = daysUntil(p.subscriptionDeadline);
                  return (
                    <TableRow
                      key={p.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/admin/products/${p.id}`)}
                    >
                      <TableCell className="px-4 py-3 whitespace-normal">
                        <div className="flex items-center gap-2">
                          <InstrumentBadge
                            short={INSTRUMENT_SHORT[instrument]}
                            isObligation={isObligation(instrument)}
                          />
                          <p className="truncate text-sm font-semibold text-rdc-navy">
                            {p.lineLabel ?? p.code}
                          </p>
                        </div>
                        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                          {p.isin ?? p.code}
                        </p>
                      </TableCell>
                      <TableCell className="px-4 py-3 whitespace-normal">
                        <p className="font-medium">
                          {formatAmount(p.totalVolume, p.currency)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          nominal {formatAmount(p.faceValue, p.currency)} · mini{" "}
                          {formatAmount(p.minTicket, p.currency)}
                        </p>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-base font-bold text-primary">
                        {formatRatePercent(rate)}
                      </TableCell>
                      <TableCell className="px-4 py-3 whitespace-normal">
                        <p className="text-sm">{formatDate(p.subscriptionDeadline)}</p>
                        {p.status === "OPEN" && (
                          <p
                            className={cn(
                              "text-[11px]",
                              days <= 3
                                ? "font-semibold text-amber-700"
                                : "text-muted-foreground",
                            )}
                          >
                            {days > 0
                              ? `J-${days}`
                              : days === 0
                                ? "Aujourd'hui"
                                : "Dépassée"}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <span
                          className={cn(
                            "text-sm font-semibold tabular-nums",
                            p._count.subscriptions > 0
                              ? "text-primary"
                              : "text-muted-foreground",
                          )}
                        >
                          {p._count.subscriptions}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <ProductStatusBadge status={p.status} />
                      </TableCell>
                      <TableCell
                        className="px-4 py-3 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {next && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatus(p.id, next)}
                          >
                            → {STATUS_LABELS[next]}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent
          className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
          showCloseButton
        >
          <DialogHeader className="border-b border-border pb-4 pr-8">
            <DialogTitle className="text-base text-rdc-navy">
              Nouvelle annonce d&apos;adjudication
            </DialogTitle>
            <DialogDescription>
              Annonce MinFi : instrument, ISIN, taux annoncé, calendrier. Le
              nominal et le minimum (10 titres) sont fixés automatiquement.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-5">
            <div className="space-y-1.5">
              <Label>Instrument</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {INSTRUMENTS.map((inst) => (
                  <Button
                    key={inst}
                    type="button"
                    variant={
                      form.instrumentType === inst ? "default" : "outline"
                    }
                    onClick={() => field("instrumentType", inst)}
                    className="h-10"
                  >
                    {INSTRUMENT_SHORT[inst]}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Nominal {formatAmount(String(face), currency)} · Mini{" "}
                {formatAmount(String(minTicket), currency)} (10 titres)
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                id="isin"
                label="Code ISIN"
                placeholder="CD000A1XXXX"
                value={form.isin}
                onChange={(v) => field("isin", v)}
                required
              />
              <FormField
                id="code"
                label="Code interne (optionnel)"
                placeholder="BTI-2026-001"
                value={form.code}
                onChange={(v) => field("code", v)}
              />
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="lineLabel">Ligne à ouvrir</Label>
                <Input
                  id="lineLabel"
                  required
                  placeholder="BTI 6 mois 3 mars 2026"
                  value={form.lineLabel}
                  onChange={(e) => field("lineLabel", e.target.value)}
                  className="h-10"
                />
              </div>
              <FormField
                id="totalVolume"
                label="Montant mis en adjudication"
                placeholder={currency === "CDF" ? "1000000000" : "5000000"}
                value={form.totalVolume}
                onChange={(v) => field("totalVolume", v)}
                type="number"
                required
              />
              <FormField
                id="announcedRatePercent"
                label="Taux annoncé (%)"
                placeholder="9"
                value={form.announcedRatePercent}
                onChange={(v) => field("announcedRatePercent", v)}
                type="number"
                step="0.01"
                required
              />
            </div>

            {isOt && (
              <div className="grid grid-cols-1 gap-4 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="interestPeriodsPerYear">
                    Paiements d&apos;intérêts / an
                  </Label>
                  <select
                    id="interestPeriodsPerYear"
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                    value={form.interestPeriodsPerYear}
                    onChange={(e) =>
                      field("interestPeriodsPerYear", e.target.value)
                    }
                  >
                    <option value="1">1 (annuel)</option>
                    <option value="2">2 (semestriel)</option>
                    <option value="4">4 (trimestriel)</option>
                    <option value="12">12 (mensuel)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="principalRepaymentMode">
                    Remboursement du principal
                  </Label>
                  <select
                    id="principalRepaymentMode"
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                    value={form.principalRepaymentMode}
                    onChange={(e) =>
                      field(
                        "principalRepaymentMode",
                        e.target.value as typeof form.principalRepaymentMode,
                      )
                    }
                  >
                    <option value="AT_MATURITY">À l&apos;échéance</option>
                    <option value="SEMI_ANNUAL">Tous les 6 mois</option>
                    <option value="ANNUAL">Annuel</option>
                  </select>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                id="issuanceDate"
                label="Date d'émission"
                value={form.issuanceDate}
                onChange={(v) => field("issuanceDate", v)}
                type="date"
                required
              />
              <FormField
                id="maturityDate"
                label="Date de remboursement / maturité"
                value={form.maturityDate}
                onChange={(v) => field("maturityDate", v)}
                type="date"
                required
              />
              <FormField
                id="adjudicationDate"
                label="Date d'adjudication"
                value={form.adjudicationDate}
                onChange={(v) => field("adjudicationDate", v)}
                type="date"
                required
              />
              <FormField
                id="subscriptionDeadline"
                label="Présentation des soumissions"
                value={form.subscriptionDeadline}
                onChange={(v) => field("subscriptionDeadline", v)}
                type="date"
                required
              />
              <FormField
                id="resultsDate"
                label="Annonce des résultats"
                value={form.resultsDate}
                onChange={(v) => field("resultsDate", v)}
                type="date"
              />
              <FormField
                id="settlementDate"
                label="Date de règlement"
                value={form.settlementDate}
                onChange={(v) => field("settlementDate", v)}
                type="date"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTitle>Erreur</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter className="gap-2 sm:justify-stretch">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setShowCreate(false)}
              >
                Annuler
              </Button>
              <Button type="submit" className="flex-1" disabled={saving}>
                {saving ? "Publication…" : "Publier l'annonce"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FormField({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  step,
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  step?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        step={step}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="h-10"
      />
    </div>
  );
}
