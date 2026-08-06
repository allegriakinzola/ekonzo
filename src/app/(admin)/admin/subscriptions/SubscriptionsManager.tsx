"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatAmount, formatDate } from "@/lib/format";

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

const STATUS_COLORS: Record<string, string> = {
  PENDING_PAYMENT:       "bg-amber-100 text-amber-700",
  PAYMENT_CONFIRMED:     "bg-blue-100 text-blue-700",
  SUBMITTED:             "bg-indigo-100 text-indigo-700",
  ADJUDICATED:           "bg-emerald-100 text-emerald-700",
  PARTIALLY_ADJUDICATED: "bg-yellow-100 text-yellow-700",
  ACTIVE:                "bg-emerald-100 text-emerald-700",
  REIMBURSED:            "bg-slate-100 text-slate-600",
  CANCELLED:             "bg-red-100 text-red-600",
  FAILED:                "bg-red-100 text-red-600",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT:       "Paiement attendu",
  PAYMENT_CONFIRMED:     "Paiement confirmé",
  SUBMITTED:             "Soumis",
  ADJUDICATED:           "Adjugé",
  PARTIALLY_ADJUDICATED: "Partiellement adjugé",
  ACTIVE:                "Actif",
  REIMBURSED:            "Remboursé",
  CANCELLED:             "Annulé",
  FAILED:                "Échoué",
};

const FILTER_TABS = [
  { value: "", label: "Toutes" },
  { value: "PENDING_PAYMENT", label: "En attente" },
  { value: "PAYMENT_CONFIRMED", label: "Paiement confirmé" },
  { value: "SUBMITTED", label: "Soumis" },
  { value: "ADJUDICATED", label: "Adjugés" },
];

export function SubscriptionsManager({ initial }: { initial: Subscription[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState("");
  const [acting, setActing] = useState<string | null>(null);
  const [selected, setSelected] = useState<Subscription | null>(null);
  const [adjForm, setAdjForm] = useState({ amount: "", rate: "" });

  const displayed = filter ? initial.filter((s) => s.status === filter) : initial;

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
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Souscriptions</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestion des dossiers de souscription</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {FILTER_TABS.map((t) => (
          <button key={t.value} onClick={() => setFilter(t.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
              filter === t.value ? "bg-primary text-white" : "border hover:bg-slate-50"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {displayed.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center text-sm text-muted-foreground">Aucune souscription.</div>
      ) : (
        <div className="rounded-xl border bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-medium">Investisseur</th>
                  <th className="text-left px-4 py-3 font-medium">Produit</th>
                  <th className="text-left px-4 py-3 font-medium">Montant</th>
                  <th className="text-left px-4 py-3 font-medium">Canal</th>
                  <th className="text-left px-4 py-3 font-medium">Statut</th>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {displayed.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium">{s.user.name}</p>
                      <p className="text-xs text-muted-foreground">{s.user.phoneNumber ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold mr-1 ${
                        s.product.type === "BT" ? "bg-blue-100 text-blue-700" : "bg-violet-100 text-violet-700"
                      }`}>{s.product.type}</span>
                      <span className="font-mono text-xs">{s.product.code}</span>
                    </td>
                    <td className="px-4 py-3 font-medium">{formatAmount(s.amount, s.currency)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {s.paymentChannel === "MOBILE_MONEY"
                        ? `${s.momoAccount?.operator ?? "MoMo"} · ${s.momoAccount?.phoneNumber ?? ""}`
                        : `Virement · ${s.bankAccount?.bankName ?? ""}`}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[s.status] ?? ""}`}>
                        {STATUS_LABELS[s.status] ?? s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(s.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => { setSelected(s); setAdjForm({ amount: s.amount, rate: "" }); }}
                        className="rounded-lg border px-3 py-1 text-xs font-medium hover:bg-slate-100 transition-colors">
                        Gérer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b">
              <div>
                <h2 className="font-bold text-base">{selected.user.name}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{selected.product.type} · {selected.product.code}</p>
              </div>
              <button onClick={() => setSelected(null)} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-muted-foreground transition-colors text-lg">✕</button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Montant", formatAmount(selected.amount, selected.currency)],
                  ["Titres", selected.units.toString()],
                  ["Canal", selected.paymentChannel === "MOBILE_MONEY" ? "Mobile Money" : "Virement bancaire"],
                  ["Statut", STATUS_LABELS[selected.status] ?? selected.status],
                  ...(selected.momoAccount ? [
                    ["Opérateur", selected.momoAccount.operator],
                    ["N° MoMo", selected.momoAccount.phoneNumber],
                  ] : []),
                  ...(selected.bankAccount ? [
                    ["Banque", selected.bankAccount.bankName],
                    ["Compte", selected.bankAccount.accountNumber],
                  ] : []),
                  ...(selected.bankTransferRef ? [["Réf. virement", selected.bankTransferRef]] : []),
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-slate-50 px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
                    <p className="text-sm font-semibold mt-0.5 break-all">{value}</p>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-2 border-t">
                {selected.status === "PENDING_PAYMENT" && (
                  <button onClick={() => doAction(selected.id, "confirm_payment")} disabled={acting === selected.id}
                    className="w-full h-10 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                    {acting === selected.id ? "…" : "✓ Confirmer le paiement"}
                  </button>
                )}
                {selected.status === "PAYMENT_CONFIRMED" && (
                  <button onClick={() => doAction(selected.id, "submit")} disabled={acting === selected.id}
                    className="w-full h-10 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                    {acting === selected.id ? "…" : "Marquer comme soumis"}
                  </button>
                )}
                {selected.status === "SUBMITTED" && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Montant adjugé</label>
                        <input type="number" placeholder={selected.amount} value={adjForm.amount}
                          onChange={(e) => setAdjForm((f) => ({ ...f, amount: e.target.value }))}
                          className="w-full h-9 rounded-lg border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Taux adjugé (%)</label>
                        <input type="number" step="0.01" placeholder="12.50" value={adjForm.rate}
                          onChange={(e) => setAdjForm((f) => ({ ...f, rate: e.target.value }))}
                          className="w-full h-9 rounded-lg border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                    </div>
                    <button
                      onClick={() => doAction(selected.id, "adjudicate", {
                        adjudicatedAmount: parseFloat(adjForm.amount),
                        adjudicatedRate: parseFloat(adjForm.rate) / 100,
                      })}
                      disabled={acting === selected.id || !adjForm.amount || !adjForm.rate}
                      className="w-full h-10 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                      {acting === selected.id ? "…" : "Adjuger"}
                    </button>
                  </div>
                )}
                {!["CANCELLED", "FAILED", "REIMBURSED", "ADJUDICATED", "ACTIVE", "MATURED"].includes(selected.status) && (
                  <button onClick={() => doAction(selected.id, "cancel")} disabled={acting === selected.id}
                    className="w-full h-10 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors">
                    {acting === selected.id ? "…" : "Annuler la souscription"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
