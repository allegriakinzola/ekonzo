"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChartBarIcon, PlusIcon } from "@phosphor-icons/react";

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
import { formatAmount, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  code: string;
  type: string;
  currency: string;
  faceValue: string;
  minTicket: string;
  discountRate: string | null;
  couponRate: string | null;
  couponFrequency: string | null;
  issuanceDate: string;
  maturityDate: string;
  adjudicationDate: string;
  subscriptionDeadline: string;
  totalVolume: string;
  allocatedVolume: string;
  status: string;
  createdAt: string;
  _count: { subscriptions: number };
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  OPEN: "Ouvert",
  CLOSED: "Clôturé",
  ADJUDICATED: "Adjugé",
  ACTIVE: "Actif",
  MATURED: "Échu",
};

const STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["OPEN"],
  OPEN: ["CLOSED"],
  CLOSED: ["ADJUDICATED"],
  ADJUDICATED: ["ACTIVE"],
  ACTIVE: ["MATURED"],
  MATURED: [],
};

function statusBadgeClass(status: string) {
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

export function ProductsManager({ initial }: { initial: Product[] }) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    code: "",
    currency: "USD",
    minTicket: "",
    discountRate: "",
    issuanceDate: "",
    maturityDate: "",
    adjudicationDate: "",
    subscriptionDeadline: "",
    totalVolume: "",
  });

  function field(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const minTicket = parseFloat(form.minTicket);
      const totalVolume = parseFloat(form.totalVolume);
      if (minTicket > totalVolume) {
        throw new Error(
          "Le ticket minimum ne peut pas dépasser le montant total annoncé",
        );
      }
      const body = {
        code: form.code,
        type: "BT",
        currency: form.currency,
        minTicket,
        // Compat DB : faceValue aligné sur le ticket minimum
        faceValue: minTicket,
        discountRate: parseFloat(form.discountRate) / 100,
        issuanceDate: form.issuanceDate,
        maturityDate: form.maturityDate,
        adjudicationDate: form.adjudicationDate,
        subscriptionDeadline: form.subscriptionDeadline,
        totalVolume,
      };
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setShowCreate(false);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <ChartBarIcon className="size-5" weight="duotone" />
            <span className="text-xs font-medium uppercase tracking-wide">
              Émissions
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-rdc-navy">
            Produits
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestion des Bons du Trésor
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <PlusIcon weight="bold" />
          Nouveau produit
        </Button>
      </div>

      <Card className="border-border/80 bg-card shadow-sm ring-1 ring-rdc-navy/5">
        <CardHeader className="border-b [.border-b]:pb-4">
          <CardTitle className="text-base">Catalogue</CardTitle>
          <CardDescription>
            Cliquez une ligne pour ouvrir la fiche produit
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {initial.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <ChartBarIcon
                className="size-10 text-primary/50"
                weight="duotone"
              />
              <p className="text-sm font-medium">Aucun produit créé</p>
              <p className="text-xs text-muted-foreground">
                Créez votre premier Bon du Trésor.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="px-4">Code</TableHead>
                  <TableHead className="px-4">Total / Mini</TableHead>
                  <TableHead className="px-4">Taux</TableHead>
                  <TableHead className="px-4">Souscriptions</TableHead>
                  <TableHead className="px-4">Clôture</TableHead>
                  <TableHead className="px-4">Statut</TableHead>
                  <TableHead className="px-4 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initial.map((p) => {
                  const rate = p.discountRate;
                  const next = STATUS_TRANSITIONS[p.status]?.[0];
                  return (
                    <TableRow
                      key={p.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/admin/products/${p.id}`)}
                    >
                      <TableCell className="px-4 py-3 whitespace-normal">
                        <p className="font-mono text-xs font-semibold">
                          {p.code}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {p.currency}
                        </p>
                      </TableCell>
                      <TableCell className="px-4 py-3 whitespace-normal">
                        <p className="font-medium">
                          {formatAmount(p.totalVolume, p.currency)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          mini {formatAmount(p.minTicket, p.currency)}
                        </p>
                      </TableCell>
                      <TableCell className="px-4 py-3 font-semibold text-primary">
                        {rate ? `${(Number(rate) * 100).toFixed(2)} %` : "—"}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        {p._count.subscriptions}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-muted-foreground">
                        {formatDate(p.subscriptionDeadline)}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            "",
                            statusBadgeClass(p.status),
                          )}
                        >
                          {STATUS_LABELS[p.status] ?? p.status}
                        </Badge>
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
              Nouveau produit
            </DialogTitle>
            <DialogDescription>
              Montant total à emprunter + ticket minimum. Les citoyens
              souscrivent n&apos;importe quel montant entre les deux.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  required
                  placeholder="BT-2026-001"
                  value={form.code}
                  onChange={(e) => field("code", e.target.value)}
                  className="h-10 font-mono uppercase"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Devise</Label>
                <div className="grid grid-cols-2 gap-2">
                  {["USD", "CDF"].map((c) => (
                    <Button
                      key={c}
                      type="button"
                      variant={form.currency === c ? "default" : "outline"}
                      onClick={() => field("currency", c)}
                      className="h-10"
                    >
                      {c}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                id="totalVolume"
                label="Montant total annoncé"
                placeholder="1000000000"
                value={form.totalVolume}
                onChange={(v) => field("totalVolume", v)}
                type="number"
                required
              />
              <FormField
                id="minTicket"
                label="Ticket minimum (souscription)"
                placeholder="10000"
                value={form.minTicket}
                onChange={(v) => field("minTicket", v)}
                type="number"
                required
              />
              <FormField
                id="discountRate"
                label="Taux d'escompte (%)"
                placeholder="12"
                value={form.discountRate}
                onChange={(v) => field("discountRate", v)}
                type="number"
                step="0.01"
                required
              />
            </div>

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
                label="Date de maturité"
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
                label="Clôture souscription"
                value={form.subscriptionDeadline}
                onChange={(v) => field("subscriptionDeadline", v)}
                type="date"
                required
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
                {saving ? "Publication…" : "Publier le produit"}
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
