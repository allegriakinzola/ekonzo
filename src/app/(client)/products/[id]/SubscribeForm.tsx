"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BankIcon,
  LockIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { isUsableLogoUrl } from "@/lib/logo";
import { computeSettlement } from "@/modules/products/pricing";
import type { InstrumentType, PrincipalRepaymentMode } from "@prisma/client";

interface Product {
  id: string;
  instrument: InstrumentType;
  currency: string;
  faceValue: number;
  minUnits: number;
  volumeLeft: number;
  annualRate: number;
  issuanceDate: string;
  maturityDate: string;
  interestPeriodsPerYear: number | null;
  principalRepaymentMode: PrincipalRepaymentMode | null;
  lineLabel: string;
  isin: string | null;
}

interface LinkedBank {
  name: string;
  shortName: string;
  logoUrl: string | null;
  accountNumber: string;
  accountName: string;
  currency: string;
}

function fmt(n: number, currency: string) {
  return `${Math.round(n).toLocaleString("fr-CD")} ${currency}`;
}

export function SubscribeForm({
  product,
  bank,
}: {
  product: Product;
  bank: LinkedBank | null;
}) {
  const [unitsInput, setUnitsInput] = useState(() =>
    String(Math.max(1, Number(product.minUnits) || 1)),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const faceValue = Number(product.faceValue) || 1;
  const minUnits = Math.max(1, Number(product.minUnits) || 1);
  const units = Math.max(0, parseInt(unitsInput, 10) || 0);
  const maxUnits = Math.max(
    0,
    Math.floor(Number(product.volumeLeft) / faceValue) || 0,
  );
  const nominal = units * faceValue;
  const valid =
    units >= minUnits && units <= maxUnits && maxUnits > 0 && !!bank;

  const settlement = useMemo(
    () =>
      units > 0
        ? computeSettlement({
            instrument: product.instrument,
            units,
            faceValue,
            annualRate: product.annualRate,
            issuanceDate: new Date(product.issuanceDate),
            maturityDate: new Date(product.maturityDate),
            interestPeriodsPerYear: product.interestPeriodsPerYear,
            principalRepaymentMode: product.principalRepaymentMode,
          })
        : null,
    [units, faceValue, product],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, units }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erreur lors de la souscription.");
      if (!json.redirectUrl) {
        throw new Error("URL de paiement banque manquante.");
      }
      // Redirection vers l'interface de paiement de la banque (interop)
      window.location.href = json.redirectUrl as string;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la souscription.");
      setLoading(false);
    }
  }

  if (!bank) {
    return (
      <Card className="ring-1 ring-amber-200/60">
        <CardContent className="space-y-4 py-8 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-100">
            <BankIcon className="size-7" weight="duotone" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-rdc-navy">
              Liez votre banque pour souscrire
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Les souscriptions aux titres publics passent par votre banque
              teneur de compte. Connectez votre banque partenaire, puis revenez
              sur cette émission.
            </p>
          </div>
          <Button size="lg" render={<Link href="/profile/bank" />}>
            Lier ma banque
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="ring-1 ring-rdc-navy/5">
      <CardHeader className="border-b [.border-b]:pb-4">
        <CardTitle className="text-base">Demande de souscription</CardTitle>
        <CardDescription>
          Nominal unitaire {fmt(faceValue, product.currency)} · minimum{" "}
          {minUnits} titres · {maxUnits.toLocaleString("fr-CD")} titres
          disponibles.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex items-center gap-3 rounded-xl border bg-muted/40 p-3">
            {isUsableLogoUrl(bank.logoUrl) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={bank.logoUrl}
                alt={bank.shortName}
                className="h-10 w-10 rounded-md border bg-white object-contain p-0.5"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-white text-xs font-bold text-rdc-navy">
                {bank.shortName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-rdc-navy">{bank.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {bank.accountName} · {bank.accountNumber} · {bank.currency}
              </p>
            </div>
            <Link
              href="/profile/bank"
              className="text-xs text-primary hover:underline"
            >
              Changer
            </Link>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="units">Nombre de titres</Label>
            <div className="relative">
              <Input
                id="units"
                type="number"
                min={minUnits}
                max={maxUnits > 0 ? maxUnits : undefined}
                step={1}
                value={unitsInput}
                onChange={(e) => setUnitsInput(e.target.value)}
                className="h-11 pr-16"
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                titres
              </span>
            </div>
            <p
              className={cn(
                "text-xs",
                units === 0
                  ? "text-muted-foreground"
                  : valid
                    ? "text-emerald-600"
                    : "text-destructive",
              )}
            >
              {units === 0
                ? `Saisissez au moins ${minUnits} titres.`
                : units < minUnits
                  ? `Minimum ${minUnits} titres (${fmt(minUnits * faceValue, product.currency)}).`
                  : units > maxUnits
                    ? `Maximum ${maxUnits.toLocaleString("fr-CD")} titres disponibles.`
                    : `Montant nominal : ${fmt(nominal, product.currency)}`}
            </p>
          </div>

          {settlement && units >= minUnits && (
            <div className="space-y-2 rounded-xl border bg-card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Récapitulatif
              </p>
              <Row label="Montant nominal" value={fmt(settlement.nominal, product.currency)} />
              <Row
                label={`Taux annoncé`}
                value={`${(product.annualRate * 100).toFixed(2)} % l'an`}
              />
              {settlement.kind === "BT" ? (
                <>
                  <Row
                    label={`Intérêts précomptés (${settlement.days} j)`}
                    value={`− ${fmt(settlement.interest, product.currency)}`}
                  />
                  <Row
                    label="À régler via votre banque"
                    value={fmt(settlement.payable, product.currency)}
                    strong
                  />
                  <Row
                    label="Remboursé à l'échéance"
                    value={fmt(settlement.nominal, product.currency)}
                  />
                </>
              ) : (
                <>
                  <Row
                    label="À régler via votre banque (au pair)"
                    value={fmt(settlement.payable, product.currency)}
                    strong
                  />
                  <Row
                    label={`Intérêts par période (${settlement.totalInterestPayments} paiements)`}
                    value={fmt(settlement.interestPerPeriod, product.currency)}
                  />
                  <Row
                    label="Total des intérêts"
                    value={fmt(settlement.totalInterest, product.currency)}
                  />
                  <Row
                    label={`Principal (${settlement.principalPayments} remboursement${settlement.principalPayments > 1 ? "s" : ""})`}
                    value={`${fmt(settlement.principalPerPayment, product.currency)} / paiement`}
                  />
                </>
              )}
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <WarningCircleIcon className="size-4" weight="fill" />
              <AlertTitle>Erreur</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="h-11 w-full"
            size="lg"
            disabled={loading || !valid}
          >
            {loading
              ? "Redirection vers votre banque…"
              : settlement && valid
                ? `Payer ${fmt(settlement.payable, product.currency)} via ${bank.shortName}`
                : "Payer via ma banque"}
          </Button>

          <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
            <LockIcon className="size-3.5" />
            Vous serez redirigé vers {bank.shortName} pour confirmer le
            paiement · ekonzo sera notifié automatiquement
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("text-right", strong ? "font-bold text-primary" : "font-medium")}>
        {value}
      </span>
    </div>
  );
}
