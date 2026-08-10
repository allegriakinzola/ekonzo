"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BankIcon,
  CheckCircleIcon,
  DeviceMobileIcon,
  LockIcon,
  SpinnerGapIcon,
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

interface Product {
  id: string;
  type: string;
  currency: string;
  minTicket: string;
  volumeLeft: string;
  discountRate: string | null;
  couponRate: string | null;
}

type PayPhase =
  | "form"
  | "awaiting_ussd"
  | "confirmed"
  | "failed"
  | "bank_pending";

export function SubscribeForm({
  product,
  accountPhone,
  settlement,
}: {
  product: Product;
  accountPhone: string;
  settlement?: {
    preferredChannel: "MOBILE_MONEY" | "BANK_TRANSFER";
    momoPhone: string | null;
    bankName: string | null;
    bankAccountNumber: string | null;
    isComplete: boolean;
  } | null;
}) {
  const router = useRouter();
  const defaultMomo = settlement?.momoPhone || accountPhone || "";
  const [channel, setChannel] = useState<"MOBILE_MONEY" | "BANK_TRANSFER">(
    settlement?.preferredChannel ?? "MOBILE_MONEY",
  );
  const [amount, setAmount] = useState("");
  const [momoPhone, setMomoPhone] = useState(defaultMomo);
  const [bankName, setBankName] = useState(settlement?.bankName ?? "");
  const [bankAccount, setBankAccount] = useState(
    settlement?.bankAccountNumber ?? "",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<PayPhase>("form");
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const minTicket = Number(product.minTicket);
  const volumeLeft = Number(product.volumeLeft);
  const amountNum = parseFloat(amount) || 0;
  const valid =
    amountNum >= minTicket && amountNum <= volumeLeft && volumeLeft > 0;

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function startPolling(subId: string) {
    setSubscriptionId(subId);
    setPhase("awaiting_ussd");
    setPollCount(0);

    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      setPollCount((c) => c + 1);
      try {
        const res = await fetch(
          `/api/subscriptions/${subId}/payment-status`,
        );
        if (!res.ok) return;
        const json = (await res.json()) as { status?: string };
        if (json.status === "SUCCESS") {
          if (pollRef.current) clearInterval(pollRef.current);
          setPhase("confirmed");
          setTimeout(() => router.push("/portfolio"), 2500);
        } else if (json.status === "FAILED" || json.status === "CANCELLED") {
          if (pollRef.current) clearInterval(pollRef.current);
          setPhase("failed");
          setError(
            json.status === "CANCELLED"
              ? "Paiement annulé sur le menu USSD."
              : "Paiement refusé. Réessayez plus tard.",
          );
        }
      } catch {
        // ignore transient network errors during poll
      }
    }, 4000);

    // Arrêt après ~3 min
    setTimeout(() => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }, 180_000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          amount: amountNum,
          paymentChannel: channel,
          ...(channel === "MOBILE_MONEY"
            ? { momoPhone: momoPhone.trim() }
            : { bankName, bankAccount }),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erreur lors de la souscription.");

      if (channel === "MOBILE_MONEY") {
        if (!momoPhone.trim()) {
          throw new Error(
            "Aucun numéro Mobile Money. Configurez votre profil de règlement.",
          );
        }
        if (!json.momoPromptSent || !json.id) {
          throw new Error(
            json.error ?? "Le prompt USSD n’a pas pu être envoyé.",
          );
        }
        startPolling(json.id as string);
      } else {
        setPhase("bank_pending");
        setTimeout(() => router.push("/portfolio"), 4000);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de la souscription.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (phase === "awaiting_ussd" || phase === "confirmed" || phase === "failed") {
    return (
      <Card className="ring-1 ring-rdc-navy/5">
        <CardContent className="space-y-4 py-8 text-center">
          <div
            className={cn(
              "mx-auto flex size-16 items-center justify-center rounded-full ring-1",
              phase === "confirmed" &&
                "bg-emerald-50 text-emerald-700 ring-emerald-100",
              phase === "failed" &&
                "bg-destructive/10 text-destructive ring-destructive/20",
              phase === "awaiting_ussd" &&
                "bg-primary/10 text-primary ring-primary/20",
            )}
          >
            {phase === "awaiting_ussd" ? (
              <SpinnerGapIcon className="size-8 animate-spin" weight="bold" />
            ) : phase === "confirmed" ? (
              <CheckCircleIcon className="size-8" weight="fill" />
            ) : (
              <WarningCircleIcon className="size-8" weight="fill" />
            )}
          </div>

          <div>
            <h3 className="text-lg font-bold text-rdc-navy">
              {phase === "awaiting_ussd" && "Confirmez sur votre téléphone"}
              {phase === "confirmed" && "Paiement confirmé"}
              {phase === "failed" && "Paiement non abouti"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {phase === "awaiting_ussd" &&
                "Un menu USSD / notification Mobile Money a été envoyé."}
              {phase === "confirmed" &&
                "Votre souscription est enregistrée. Redirection…"}
              {phase === "failed" && error}
            </p>
          </div>

          {phase === "awaiting_ussd" && (
            <Alert className="border-primary/20 bg-primary/5 text-left text-primary">
              <DeviceMobileIcon className="size-4" weight="fill" />
              <AlertTitle>Prompt USSD envoyé</AlertTitle>
              <AlertDescription className="text-primary/80">
                Sur <strong>{accountPhone}</strong>, validez le paiement de{" "}
                <strong>
                  {amountNum.toLocaleString("fr-CD")} {product.currency}
                </strong>{" "}
                avec votre code PIN Mobile Money.
                <span className="mt-2 block text-xs opacity-80">
                  En attente de confirmation
                  {pollCount > 0 ? ` (${pollCount})` : "…"}
                  {subscriptionId ? ` · réf. ${subscriptionId.slice(0, 8)}` : ""}
                </span>
              </AlertDescription>
            </Alert>
          )}

          {phase === "failed" && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                setPhase("form");
                setError("");
              }}
            >
              Réessayer
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (phase === "bank_pending") {
    return (
      <Card className="ring-1 ring-rdc-navy/5">
        <CardContent className="space-y-4 py-8 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
            <CheckCircleIcon className="size-8" weight="fill" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-rdc-navy">
              Souscription enregistrée
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Effectuez le virement puis conservez votre reçu.
            </p>
          </div>
          <Alert className="border-primary/20 bg-primary/5 text-left text-primary">
            <AlertTitle>Virement bancaire</AlertTitle>
            <AlertDescription className="text-primary/80">
              Envoyez{" "}
              <strong>
                {amountNum.toLocaleString("fr-CD")} {product.currency}
              </strong>{" "}
              vers le compte du Trésor Public.
            </AlertDescription>
          </Alert>
          <p className="text-xs text-muted-foreground">
            Redirection vers votre portefeuille…
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="ring-1 ring-rdc-navy/5">
      <CardHeader className="border-b [.border-b]:pb-4">
        <CardTitle className="text-base">Formulaire de souscription</CardTitle>
        <CardDescription>
          Minimum {minTicket.toLocaleString("fr-CD")} {product.currency} ·{" "}
          Disponible {volumeLeft.toLocaleString("fr-CD")} {product.currency}.
          Vous pouvez souscrire n&apos;importe quel montant dans cet intervalle.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="amount">
              Montant à investir ({product.currency})
            </Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                min={minTicket}
                max={volumeLeft}
                step="any"
                placeholder={minTicket.toString()}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-11 pr-16"
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                {product.currency}
              </span>
            </div>
            {amountNum > 0 && (
              <p
                className={cn(
                  "text-xs",
                  valid ? "text-emerald-600" : "text-destructive",
                )}
              >
                {amountNum < minTicket
                  ? `Minimum requis : ${minTicket.toLocaleString("fr-CD")} ${product.currency}`
                  : amountNum > volumeLeft
                    ? `Maximum disponible : ${volumeLeft.toLocaleString("fr-CD")} ${product.currency}`
                    : `Montant accepté : ${amountNum.toLocaleString("fr-CD")} ${product.currency}`}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Mode de paiement</Label>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  {
                    value: "MOBILE_MONEY" as const,
                    label: "Mobile Money",
                    icon: DeviceMobileIcon,
                  },
                  {
                    value: "BANK_TRANSFER" as const,
                    label: "Virement bancaire",
                    icon: BankIcon,
                  },
                ] as const
              ).map((ch) => {
                const Icon = ch.icon;
                return (
                  <button
                    key={ch.value}
                    type="button"
                    onClick={() => setChannel(ch.value)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl border-2 p-4 text-sm font-medium transition-all",
                      channel === ch.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/30",
                    )}
                  >
                    <Icon className="size-5" weight="duotone" />
                    <span>{ch.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {channel === "MOBILE_MONEY" && (
            <div className="space-y-1.5">
              <Label htmlFor="momoPhone">Numéro Mobile Money</Label>
              <Input
                id="momoPhone"
                value={momoPhone}
                onChange={(e) => setMomoPhone(e.target.value)}
                placeholder="812345678"
                inputMode="numeric"
                maxLength={9}
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                Prérempli depuis votre{" "}
                <a href="/settlement" className="underline hover:text-foreground">
                  profil de règlement
                </a>
                . EasyPay enverra le prompt USSD sur ce numéro.
              </p>
            </div>
          )}

          {channel === "BANK_TRANSFER" && (
            <div className="space-y-4">
              <div className="space-y-1 rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">
                  Coordonnées bancaires du Trésor Public
                </p>
                <p>
                  Banque : <strong>Banque Centrale du Congo (BCC)</strong>
                </p>
                <p>
                  Compte : <strong>CD12 3456 7890 1234 5678</strong>
                </p>
                <p>
                  Référence :{" "}
                  <strong>EKONZO-{Date.now().toString().slice(-8)}</strong>
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bankName">Votre banque</Label>
                <Input
                  id="bankName"
                  placeholder="Ex : Rawbank, Equity BCDC…"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="h-11"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bankAccount">Votre numéro de compte</Label>
                <Input
                  id="bankAccount"
                  placeholder="Ex : 123456789"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  className="h-11"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Prérempli depuis votre{" "}
                <a href="/settlement" className="underline hover:text-foreground">
                  profil de règlement
                </a>
                .
              </p>
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
            disabled={
              loading ||
              !valid ||
              amountNum === 0 ||
              (channel === "MOBILE_MONEY" && !momoPhone.trim()) ||
              (channel === "BANK_TRANSFER" &&
                (!bankName.trim() || !bankAccount.trim()))
            }
          >
            {loading
              ? channel === "MOBILE_MONEY"
                ? "Envoi du prompt USSD…"
                : "Traitement en cours…"
              : channel === "MOBILE_MONEY"
                ? `Payer ${amountNum > 0 ? amountNum.toLocaleString("fr-CD") : "—"} ${product.currency} par Mobile Money`
                : `Confirmer la souscription de ${amountNum > 0 ? amountNum.toLocaleString("fr-CD") : "—"} ${product.currency}`}
          </Button>

          <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
            <LockIcon className="size-3.5" />
            Paiement sécurisé via EasyPay · réglementation BCC
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
