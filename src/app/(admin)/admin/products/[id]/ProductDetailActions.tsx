"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ProductDetailActions({
  productId,
  currentStatus,
  nextStatus,
  nextLabel,
}: {
  productId: string;
  currentStatus: string;
  nextStatus: string;
  nextLabel: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleTransition() {
    setLoading(true);
    await fetch(`/api/admin/products/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    setLoading(false);
    router.refresh();
  }

  const COLORS: Record<string, string> = {
    OPEN:        "bg-emerald-600 hover:bg-emerald-700",
    CLOSED:      "bg-orange-600 hover:bg-orange-700",
    ADJUDICATED: "bg-blue-600 hover:bg-blue-700",
    ACTIVE:      "bg-violet-600 hover:bg-violet-700",
    MATURED:     "bg-slate-600 hover:bg-slate-700",
  };

  const DESCRIPTIONS: Record<string, string> = {
    OPEN:        "Le produit devient visible et souscriptible par les investisseurs.",
    CLOSED:      "La période de souscription est terminée. Les investisseurs ne peuvent plus souscrire.",
    ADJUDICATED: "Les souscriptions sont traitées. Vous pouvez maintenant adjuger individuellement.",
    ACTIVE:      "Le produit est actif — les investisseurs détiennent leurs titres.",
    MATURED:     "Le produit est arrivé à maturité. Le capital est à rembourser.",
  };

  return (
    <div className="rounded-xl border bg-white p-5">
      <h3 className="text-sm font-semibold mb-1">Faire avancer le statut</h3>
      <p className="text-xs text-muted-foreground mb-4">{DESCRIPTIONS[nextStatus]}</p>
      <button
        onClick={handleTransition}
        disabled={loading}
        className={`h-10 rounded-lg px-5 text-sm font-semibold text-white disabled:opacity-50 transition-colors ${COLORS[nextStatus] ?? "bg-primary hover:bg-primary/90"}`}
      >
        {loading ? "…" : `→ Passer en "${nextLabel}"`}
      </button>
    </div>
  );
}
