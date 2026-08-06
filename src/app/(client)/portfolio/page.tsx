import Link from "next/link";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatAmount, formatDate } from "@/lib/format";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING_PAYMENT:          { label: "En attente de paiement",    color: "bg-amber-100 text-amber-700" },
  PAYMENT_CONFIRMED:        { label: "Paiement confirmé",          color: "bg-blue-100 text-blue-700" },
  SUBMITTED:                { label: "Soumis",                     color: "bg-indigo-100 text-indigo-700" },
  ADJUDICATED:              { label: "Adjugé",                     color: "bg-emerald-100 text-emerald-700" },
  PARTIALLY_ADJUDICATED:    { label: "Partiellement adjugé",       color: "bg-yellow-100 text-yellow-700" },
  ACTIVE:                   { label: "Actif",                      color: "bg-emerald-100 text-emerald-700" },
  REIMBURSED:               { label: "Remboursé",                  color: "bg-slate-100 text-slate-600" },
  CANCELLED:                { label: "Annulé",                     color: "bg-red-100 text-red-600" },
  FAILED:                   { label: "Échoué",                     color: "bg-red-100 text-red-600" },
};

export default async function PortfolioPage() {
  const session = await requireRole("CLIENT");

  const [subscriptions, wallets] = await Promise.all([
    prisma.subscription.findMany({
      where: { userId: session.user.id },
      include: {
        product: {
          select: { code: true, type: true, currency: true, maturityDate: true, discountRate: true, couponRate: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.wallet.findMany({
      where: { userId: session.user.id },
    }),
  ]);

  const activeSubscriptions = subscriptions.filter(
    (s) => ["ACTIVE", "ADJUDICATED", "PARTIALLY_ADJUDICATED", "PAYMENT_CONFIRMED", "SUBMITTED"].includes(s.status)
  );
  const totalInvestedUSD = activeSubscriptions
    .filter((s) => s.currency === "USD")
    .reduce((acc, s) => acc + Number(s.adjudicatedAmount ?? s.amount), 0);
  const totalInvestedCDF = activeSubscriptions
    .filter((s) => s.currency === "CDF")
    .reduce((acc, s) => acc + Number(s.adjudicatedAmount ?? s.amount), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mon portefeuille</h1>
        <p className="text-sm text-muted-foreground mt-1">Suivi de vos placements et de votre solde</p>
      </div>

      {/* Wallets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Capital investi USD */}
        <div className="rounded-xl border bg-white p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Capital investi (USD)</p>
          <p className="text-2xl font-bold mt-1.5">{formatAmount(totalInvestedUSD.toString(), "USD")}</p>
          <p className="text-xs text-muted-foreground mt-1">{activeSubscriptions.filter(s => s.currency === "USD").length} placement(s) actif(s)</p>
        </div>
        {/* Capital investi CDF */}
        <div className="rounded-xl border bg-white p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Capital investi (CDF)</p>
          <p className="text-2xl font-bold mt-1.5">{formatAmount(totalInvestedCDF.toString(), "CDF")}</p>
          <p className="text-xs text-muted-foreground mt-1">{activeSubscriptions.filter(s => s.currency === "CDF").length} placement(s) actif(s)</p>
        </div>
        {/* Wallets */}
        {wallets.length > 0 ? wallets.map((w) => (
          <div key={w.id} className="rounded-xl border bg-white p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Solde wallet ({w.currency})</p>
            <p className="text-2xl font-bold mt-1.5">{formatAmount(w.balance.toString(), w.currency)}</p>
            <p className="text-xs text-muted-foreground mt-1">Disponible</p>
          </div>
        )) : (
          <div className="rounded-xl border bg-white p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Solde wallet</p>
            <p className="text-2xl font-bold mt-1.5">—</p>
            <p className="text-xs text-muted-foreground mt-1">Aucun wallet créé</p>
          </div>
        )}
      </div>

      {/* Subscriptions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Mes souscriptions</h2>
          <Link
            href="/products"
            className="text-xs font-medium text-primary hover:underline"
          >
            + Nouvelle souscription
          </Link>
        </div>

        {subscriptions.length === 0 ? (
          <div className="rounded-xl border bg-white p-12 text-center">
            <p className="text-4xl mb-4">📊</p>
            <p className="font-semibold text-base">Aucune souscription</p>
            <p className="text-sm text-muted-foreground mt-2">
              Souscrivez à un Bon du Trésor pour commencer à investir.
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 mt-5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
            >
              Voir les produits →
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-xs text-muted-foreground uppercase tracking-wide">
                    <th className="text-left px-4 py-3 font-medium">Produit</th>
                    <th className="text-left px-4 py-3 font-medium">Montant</th>
                    <th className="text-left px-4 py-3 font-medium">Titres</th>
                    <th className="text-left px-4 py-3 font-medium">Taux</th>
                    <th className="text-left px-4 py-3 font-medium">Maturité</th>
                    <th className="text-left px-4 py-3 font-medium">Statut</th>
                    <th className="text-left px-4 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {subscriptions.map((s) => {
                    const rate = s.adjudicatedRate ?? s.product.discountRate;
                    const st = STATUS_LABELS[s.status] ?? { label: s.status, color: "bg-slate-100 text-slate-600" };
                    return (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold mr-1.5 bg-blue-100 text-blue-700">
                              BT
                            </span>
                            <span className="font-mono text-xs">{s.product.code}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {formatAmount((s.adjudicatedAmount ?? s.amount).toString(), s.currency)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{s.units}</td>
                        <td className="px-4 py-3 font-medium text-primary">
                          {rate ? `${(Number(rate) * 100).toFixed(2)} %` : "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(s.product.maturityDate)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${st.color}`}>
                            {st.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(s.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
