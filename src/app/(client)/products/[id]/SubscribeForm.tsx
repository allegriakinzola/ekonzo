"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Product {
  id: string;
  type: string;
  currency: string;
  faceValue: string;
  minTicket: string;
  discountRate: string | null;
  couponRate: string | null;
}

const MOMO_OPERATORS = [
  { value: "AIRTEL", label: "Airtel Money" },
  { value: "ORANGE", label: "Orange Money" },
  { value: "MPESA", label: "M-Pesa" },
];

export function SubscribeForm({ product }: { product: Product }) {
  const router = useRouter();
  const [channel, setChannel] = useState<"MOBILE_MONEY" | "BANK_TRANSFER">("MOBILE_MONEY");
  const [amount, setAmount] = useState("");
  const [momoOperator, setMomoOperator] = useState("AIRTEL");
  const [momoPhone, setMomoPhone] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [momoPromptSent, setMomoPromptSent] = useState(false);

  const minTicket = Number(product.minTicket);
  const faceValue = Number(product.faceValue);
  const amountNum = parseFloat(amount) || 0;
  const units = amountNum >= faceValue ? Math.floor(amountNum / faceValue) : 0;
  const valid = amountNum >= minTicket && units >= 1;

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
          ...(channel === "MOBILE_MONEY" ? { momoOperator, momoPhone } : { bankName, bankAccount }),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMomoPromptSent(json.momoPromptSent === true);
      setSuccess(true);
      setTimeout(() => router.push("/portfolio"), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de la souscription.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-xl border bg-white p-8 text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">✅</div>
        <div>
          <h3 className="text-lg font-bold">Souscription enregistrée !</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Votre demande est en attente de confirmation du paiement.
          </p>
        </div>
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-left text-sm text-blue-800">
          {channel === "BANK_TRANSFER" ? (
            <>
              <p className="font-semibold">Effectuez le virement bancaire</p>
              <p className="text-xs mt-1 text-blue-700">
                Envoyez <strong>{amountNum.toLocaleString("fr-CD")} {product.currency}</strong> vers le compte du Trésor Public et conservez votre reçu.
              </p>
            </>
          ) : (
            <>
              {momoPromptSent ? (
                <>
                  <p className="font-semibold">✅ Prompt USSD envoyé !</p>
                  <p className="text-xs mt-1 text-blue-700">
                    Vérifiez votre téléphone <strong>{momoPhone}</strong> et confirmez le paiement de{" "}
                    <strong>{amountNum.toLocaleString("fr-CD")} {product.currency}</strong> sur votre menu Mobile Money.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold">Confirmez le paiement Mobile Money</p>
                  <p className="text-xs mt-1 text-blue-700">
                    Composez le code USSD de votre opérateur pour payer{" "}
                    <strong>{amountNum.toLocaleString("fr-CD")} {product.currency}</strong> depuis <strong>{momoPhone}</strong>.
                  </p>
                </>
              )}
            </>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Redirection vers votre portefeuille…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border bg-white overflow-hidden">
      <div className="px-5 py-4 border-b bg-slate-50">
        <p className="font-semibold text-sm">Formulaire de souscription</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          1 titre = {faceValue.toLocaleString("fr-CD")} {product.currency} · Ticket minimum : {minTicket.toLocaleString("fr-CD")} {product.currency}
          {faceValue > minTicket && (
            <span className="text-amber-600 font-medium"> · Montant effectif min : {faceValue.toLocaleString("fr-CD")} {product.currency}</span>
          )}
        </p>
      </div>

      <div className="p-5 space-y-5">
        {/* Amount */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Montant à investir ({product.currency})</label>
          <div className="relative">
            <input
              type="number"
              min={minTicket}
              step={faceValue}
              placeholder={minTicket.toString()}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full h-11 rounded-lg border border-input bg-background pl-3 pr-20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              required
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
              {product.currency}
            </span>
          </div>
          {amountNum > 0 && (
            <p className={`text-xs ${valid ? "text-emerald-600" : "text-red-500"}`}>
              {units >= 1
                ? `→ ${units} titre${units > 1 ? "s" : ""} · ${(amountNum - units * faceValue).toLocaleString("fr-CD")} ${product.currency} de reste`
                : amountNum < minTicket
                  ? `Minimum requis : ${minTicket.toLocaleString("fr-CD")} ${product.currency}`
                  : `Montant insuffisant — il faut au moins ${faceValue.toLocaleString("fr-CD")} ${product.currency} pour acquérir 1 titre`}
            </p>
          )}
        </div>

        {/* Payment channel */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Mode de paiement</label>
          <div className="grid grid-cols-2 gap-3">
            {(["MOBILE_MONEY", "BANK_TRANSFER"] as const).map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => setChannel(ch)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-4 text-sm font-medium transition-all ${
                  channel === ch ? "border-primary bg-primary/5" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <span className="text-xl">{ch === "MOBILE_MONEY" ? "📱" : "🏦"}</span>
                <span>{ch === "MOBILE_MONEY" ? "Mobile Money" : "Virement bancaire"}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Mobile Money fields */}
        {channel === "MOBILE_MONEY" && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Opérateur</label>
              <div className="grid grid-cols-3 gap-2">
                {MOMO_OPERATORS.map((op) => (
                  <button
                    key={op.value}
                    type="button"
                    onClick={() => setMomoOperator(op.value)}
                    className={`rounded-lg border-2 py-2 text-xs font-medium transition-all ${
                      momoOperator === op.value ? "border-primary bg-primary/5 text-primary" : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {op.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Numéro Mobile Money</label>
              <input
                type="tel"
                placeholder="+243 8X XXX XXXX"
                value={momoPhone}
                onChange={(e) => setMomoPhone(e.target.value)}
                className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                required
              />
            </div>
          </div>
        )}

        {/* Bank Transfer fields */}
        {channel === "BANK_TRANSFER" && (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 border p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Coordonnées bancaires du Trésor Public</p>
              <p>Banque : <strong>Banque Centrale du Congo (BCC)</strong></p>
              <p>Compte : <strong>CD12 3456 7890 1234 5678</strong></p>
              <p>Référence : <strong>EKONZO-{Date.now().toString().slice(-8)}</strong></p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Votre banque</label>
              <input
                placeholder="Ex : Rawbank, Equity BCDC…"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Votre numéro de compte</label>
              <input
                placeholder="Ex : 123456789"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                required
              />
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-center gap-2">
            <span>⚠️</span> {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !valid || amountNum === 0}
          className="w-full h-11 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Traitement en cours…
            </span>
          ) : (
            `Confirmer la souscription de ${amountNum > 0 ? amountNum.toLocaleString("fr-CD") : "—"} ${product.currency}`
          )}
        </button>

        <p className="text-xs text-center text-muted-foreground">
          🔒 Votre souscription est traitée conformément à la réglementation de la BCC.
        </p>
      </div>
    </form>
  );
}
