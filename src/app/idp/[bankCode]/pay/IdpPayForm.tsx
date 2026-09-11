"use client";

import { useEffect, useRef, useState } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Method = "BANK_ACCOUNT" | "MOBILE_MONEY";
type MomoPhase = "idle" | "awaiting" | "failed";

const POLL_INTERVAL_MS = 4000;
const POLL_TIMEOUT_MS = 180_000;

function fmt(amount: number, currency: string) {
  return `${Math.round(amount).toLocaleString("fr-CD")} ${currency}`;
}

export function IdpPayForm({
  bankCode,
  bankName,
  shortName,
  logoUrl,
  token,
  amount,
  currency,
  productLabel,
  instrumentKind,
  accountNumber,
  accountName,
  alreadyPaid,
  returnUrl,
  initialMomoPhone,
}: {
  bankCode: string;
  bankName: string;
  shortName: string;
  logoUrl: string | null;
  token: string;
  amount: number;
  currency: string;
  productLabel: string;
  instrumentKind: string;
  accountNumber: string;
  accountName: string;
  alreadyPaid: boolean;
  returnUrl: string;
  initialMomoPhone?: string | null;
}) {
  const [method, setMethod] = useState<Method>("BANK_ACCOUNT");
  const [momoPhone, setMomoPhone] = useState(initialMomoPhone ?? "");
  const [momoPhase, setMomoPhase] = useState<MomoPhase>("idle");
  const [pollCount, setPollCount] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(alreadyPaid);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const momoValid = /^[89]\d{8}$/.test(momoPhone.replace(/\D/g, ""));

  useEffect(() => {
    return () => stopPolling();
  }, []);

  function stopPolling() {
    if (pollRef.current) clearInterval(pollRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    pollRef.current = null;
    timeoutRef.current = null;
  }

  function goBack(url?: string) {
    window.setTimeout(() => {
      window.location.href = url || returnUrl;
    }, 2200);
  }

  const confirmMessage =
    method === "MOBILE_MONEY"
      ? `Voulez-vous payer ${fmt(amount, currency)} par Mobile Money (${momoPhone}) pour le compte du ${instrumentKind} « ${productLabel} » pour ekonzo ?`
      : `Voulez-vous payer ${fmt(amount, currency)} pour le compte du ${instrumentKind} « ${productLabel} » pour ekonzo ?`;

  async function payWithBankAccount() {
    const res = await fetch(`/api/idp/${bankCode}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Paiement refusé");
    setConfirmOpen(false);
    setSuccessOpen(true);
    goBack(json.returnUrl);
  }

  function startMomoPolling() {
    stopPolling();
    setPollCount(0);
    pollRef.current = setInterval(async () => {
      setPollCount((c) => c + 1);
      try {
        const res = await fetch(
          `/api/idp/${bankCode}/pay/momo?token=${encodeURIComponent(token)}`,
        );
        if (!res.ok) return;
        const json = (await res.json()) as {
          status?: string;
          returnUrl?: string;
          error?: string;
        };
        if (json.status === "SUCCESS") {
          stopPolling();
          setMomoPhase("idle");
          setSuccessOpen(true);
          goBack(json.returnUrl);
        } else if (json.status === "FAILED" || json.status === "CANCELLED") {
          stopPolling();
          setMomoPhase("failed");
          setError(
            json.error ??
              (json.status === "CANCELLED"
                ? "Paiement annulé sur le menu USSD."
                : "Paiement Mobile Money non abouti."),
          );
        }
      } catch {
        // erreurs réseau transitoires ignorées
      }
    }, POLL_INTERVAL_MS);

    timeoutRef.current = setTimeout(() => {
      stopPolling();
      setMomoPhase("failed");
      setError(
        "Aucune confirmation reçue de l'opérateur. Vérifiez votre téléphone puis réessayez.",
      );
    }, POLL_TIMEOUT_MS);
  }

  async function payWithMomo() {
    const res = await fetch(`/api/idp/${bankCode}/pay/momo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, phone: momoPhone.replace(/\D/g, "") }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Paiement Mobile Money refusé");
    setConfirmOpen(false);
    setMomoPhase("awaiting");
    startMomoPolling();
  }

  async function handlePay() {
    setLoading(true);
    setError("");
    try {
      if (method === "MOBILE_MONEY") await payWithMomo();
      else await payWithBankAccount();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de paiement");
      setConfirmOpen(false);
      if (method === "MOBILE_MONEY") setMomoPhase("failed");
    } finally {
      setLoading(false);
    }
  }

  const canPay =
    !alreadyPaid &&
    momoPhase !== "awaiting" &&
    (method === "BANK_ACCOUNT" || momoValid);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,oklch(0.97_0.02_250)_0%,oklch(0.98_0.01_220)_100%)] px-6 py-12">
      <div className="w-full max-w-md space-y-6 rounded-xl border bg-card p-8 shadow-sm">
        <div className="space-y-3 text-center">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={shortName}
              className="mx-auto h-14 w-auto max-w-[160px] object-contain"
            />
          ) : (
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-rdc-navy text-lg font-bold text-white">
              {shortName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <h1 className="text-xl font-semibold text-rdc-navy">
            Paiement {shortName}
          </h1>
          <p className="text-sm text-muted-foreground">{bankName}</p>
        </div>

        <div className="space-y-3 rounded-lg border bg-muted/40 p-4 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Bénéficiaire</span>
            <span className="font-medium text-rdc-navy">ekonzo</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Titre public</span>
            <span className="text-right font-medium">{productLabel}</span>
          </div>
          <div className="flex justify-between gap-3 border-t pt-3">
            <span className="text-muted-foreground">Montant</span>
            <span className="text-lg font-bold text-primary">
              {fmt(amount, currency)}
            </span>
          </div>
        </div>

        {!alreadyPaid && momoPhase !== "awaiting" && (
          <div className="space-y-3">
            <Label>Moyen de paiement</Label>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  {
                    value: "BANK_ACCOUNT" as Method,
                    label: "Compte bancaire",
                    hint: "Par défaut",
                    icon: BankIcon,
                  },
                  {
                    value: "MOBILE_MONEY" as Method,
                    label: "Mobile Money",
                    hint: "Airtel · Orange · M-Pesa",
                    icon: DeviceMobileIcon,
                  },
                ] as const
              ).map((m) => {
                const Icon = m.icon;
                const active = method === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => {
                      setMethod(m.value);
                      setError("");
                      setMomoPhase("idle");
                    }}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-sm font-medium transition-all",
                      active
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/30",
                    )}
                  >
                    <Icon className="size-5" weight="duotone" />
                    <span>{m.label}</span>
                    <span className="text-[10px] font-normal text-muted-foreground">
                      {m.hint}
                    </span>
                  </button>
                );
              })}
            </div>

            {method === "BANK_ACCOUNT" ? (
              <div className="rounded-lg border bg-muted/30 px-3 py-2.5 text-sm">
                <p className="text-xs text-muted-foreground">Compte débité</p>
                <p className="font-medium">{accountName}</p>
                <p className="text-xs text-muted-foreground">{accountNumber}</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="momoPhone">Numéro Mobile Money</Label>
                <Input
                  id="momoPhone"
                  inputMode="numeric"
                  maxLength={9}
                  placeholder="812345678"
                  value={momoPhone}
                  onChange={(e) => setMomoPhone(e.target.value.replace(/\D/g, ""))}
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">
                  9 chiffres sans 0 ni +243. Une demande de confirmation sera
                  envoyée sur ce numéro.
                </p>
              </div>
            )}
          </div>
        )}

        {momoPhase === "awaiting" && (
          <Alert className="border-primary/20 bg-primary/5 text-primary">
            <SpinnerGapIcon className="size-4 animate-spin" weight="bold" />
            <AlertTitle>Confirmez sur votre téléphone</AlertTitle>
            <AlertDescription className="text-primary/80">
              Une demande de paiement de{" "}
              <strong>{fmt(amount, currency)}</strong> a été envoyée sur{" "}
              <strong>{momoPhone}</strong>. Validez avec votre code PIN.
              <span className="mt-2 block text-xs opacity-80">
                En attente de confirmation
                {pollCount > 0 ? ` (${pollCount})` : "…"}
              </span>
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <WarningCircleIcon className="size-4" weight="fill" />
            <AlertTitle>
              {momoPhase === "failed" ? "Paiement non abouti" : "Erreur"}
            </AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {alreadyPaid ? (
          <Button
            className="h-11 w-full"
            size="lg"
            onClick={() => {
              window.location.href = returnUrl;
            }}
          >
            Retourner sur ekonzo
          </Button>
        ) : momoPhase === "awaiting" ? (
          <Button
            className="h-11 w-full"
            size="lg"
            variant="outline"
            onClick={() => {
              stopPolling();
              setMomoPhase("idle");
            }}
          >
            Annuler l'attente
          </Button>
        ) : (
          <Button
            className="h-11 w-full"
            size="lg"
            disabled={!canPay}
            onClick={() => setConfirmOpen(true)}
          >
            {momoPhase === "failed" ? "Réessayer" : "Payer"}
          </Button>
        )}

        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <LockIcon className="size-3.5" />
          Paiement sécurisé · interopérabilité {shortName} ↔ ekonzo
        </p>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmer le paiement</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-foreground">
              {confirmMessage}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => setConfirmOpen(false)}
            >
              Annuler
            </Button>
            <Button type="button" disabled={loading} onClick={handlePay}>
              {loading
                ? method === "MOBILE_MONEY"
                  ? "Envoi de la demande…"
                  : "Paiement…"
                : "Payer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="max-w-sm text-center" showCloseButton={false}>
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
            <CheckCircleIcon className="size-8" weight="fill" />
          </div>
          <DialogHeader>
            <DialogTitle>Paiement effectué</DialogTitle>
            <DialogDescription>
              {shortName} a notifié ekonzo. Redirection en cours…
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
