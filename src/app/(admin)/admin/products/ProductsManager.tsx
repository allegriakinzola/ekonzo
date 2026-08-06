"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatAmount, formatDate } from "@/lib/format";

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

const STATUS_COLORS: Record<string, string> = {
  DRAFT:       "bg-slate-100 text-slate-600",
  OPEN:        "bg-emerald-100 text-emerald-700",
  CLOSED:      "bg-orange-100 text-orange-700",
  ADJUDICATED: "bg-blue-100 text-blue-700",
  ACTIVE:      "bg-violet-100 text-violet-700",
  MATURED:     "bg-gray-100 text-gray-600",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon", OPEN: "Ouvert", CLOSED: "Clôturé",
  ADJUDICATED: "Adjugé", ACTIVE: "Actif", MATURED: "Échu",
};

const STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["OPEN"],
  OPEN: ["CLOSED"],
  CLOSED: ["ADJUDICATED"],
  ADJUDICATED: ["ACTIVE"],
  ACTIVE: ["MATURED"],
  MATURED: [],
};


export function ProductsManager({ initial }: { initial: Product[] }) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>(initial);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [form, setForm] = useState({
    code: "", currency: "USD",
    faceValue: "", minTicket: "", discountRate: "",
    issuanceDate: "", maturityDate: "", adjudicationDate: "", subscriptionDeadline: "",
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
      const body = {
        code: form.code,
        type: "BT",
        currency: form.currency,
        faceValue: parseFloat(form.faceValue),
        minTicket: parseFloat(form.minTicket),
        discountRate: parseFloat(form.discountRate) / 100,
        issuanceDate: form.issuanceDate,
        maturityDate: form.maturityDate,
        adjudicationDate: form.adjudicationDate,
        subscriptionDeadline: form.subscriptionDeadline,
        totalVolume: parseFloat(form.totalVolume),
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
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Produits</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestion des Bons du Trésor</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
        >
          + Nouveau produit
        </button>
      </div>

      {products.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center">
          <p className="text-4xl mb-4">📋</p>
          <p className="font-semibold">Aucun produit créé</p>
          <p className="text-sm text-muted-foreground mt-1">Créez votre premier Bon du Trésor.</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-xs text-muted-foreground uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-medium">Code</th>
                <th className="text-left px-4 py-3 font-medium">Valeur / Min</th>
                <th className="text-left px-4 py-3 font-medium">Taux</th>
                <th className="text-left px-4 py-3 font-medium">Souscriptions</th>
                <th className="text-left px-4 py-3 font-medium">Clôture</th>
                <th className="text-left px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map((p) => {
                const rate = p.discountRate;
                const next = STATUS_TRANSITIONS[p.status]?.[0];
                return (
                  <tr
                    key={p.id}
                    onClick={() => router.push(`/admin/products/${p.id}`)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <p className="font-mono font-semibold text-xs">{p.code}</p>
                      <p className="text-xs text-muted-foreground">{p.currency}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{formatAmount(p.faceValue, p.currency)}</p>
                      <p className="text-xs text-muted-foreground">min {formatAmount(p.minTicket, p.currency)}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-primary">
                      {rate ? `${(Number(rate) * 100).toFixed(2)} %` : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">{p._count.subscriptions}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(p.subscriptionDeadline)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[p.status] ?? ""}`}>
                        {STATUS_LABELS[p.status] ?? p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      {next && (
                        <button
                          onClick={() => handleStatus(p.id, next)}
                          className="rounded-lg border px-3 py-1 text-xs font-medium hover:bg-slate-100 transition-colors whitespace-nowrap"
                        >
                          → {STATUS_LABELS[next]}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b">
              <h2 className="font-bold text-lg">Nouveau produit</h2>
              <button onClick={() => setShowCreate(false)} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-muted-foreground transition-colors text-lg">✕</button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-5">
              {/* Code + currency */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Code</label>
                  <input required placeholder="BT-2026-001" value={form.code} onChange={(e) => field("code", e.target.value)}
                    className="w-full h-10 rounded-lg border px-3 text-sm uppercase font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Devise</label>
                  <div className="grid grid-cols-2 gap-2">
                    {["USD", "CDF"].map((c) => (
                      <button key={c} type="button" onClick={() => field("currency", c)}
                        className={`rounded-lg border-2 py-2 text-sm font-semibold transition-all ${form.currency === c ? "border-primary bg-primary/5 text-primary" : "border-slate-200"}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Amounts */}
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Valeur nominale" placeholder="100000" value={form.faceValue} onChange={(v) => field("faceValue", v)} type="number" required />
                <FormField label="Ticket minimum" placeholder="100000" value={form.minTicket} onChange={(v) => field("minTicket", v)} type="number" required />
                <FormField label="Volume total" placeholder="1000000000" value={form.totalVolume} onChange={(v) => field("totalVolume", v)} type="number" required />
                <FormField label="Taux d'escompte (%)" placeholder="14.50" value={form.discountRate} onChange={(v) => field("discountRate", v)} type="number" step="0.01" required />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Date d'émission" value={form.issuanceDate} onChange={(v) => field("issuanceDate", v)} type="date" required />
                <FormField label="Date de maturité" value={form.maturityDate} onChange={(v) => field("maturityDate", v)} type="date" required />
                <FormField label="Date d'adjudication" value={form.adjudicationDate} onChange={(v) => field("adjudicationDate", v)} type="date" required />
                <FormField label="Clôture souscription" value={form.subscriptionDeadline} onChange={(v) => field("subscriptionDeadline", v)} type="date" required />
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">⚠️ {error}</div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 h-10 rounded-lg border text-sm font-medium hover:bg-slate-50 transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 h-10 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {saving ? "Publication…" : "Publier le produit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function FormField({ label, value, onChange, type = "text", placeholder, step, required }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; step?: string; required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</label>
      <input
        type={type} placeholder={placeholder} value={value} step={step}
        onChange={(e) => onChange(e.target.value)} required={required}
        className="w-full h-10 rounded-lg border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
      />
    </div>
  );
}
