import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatAmount, formatDate } from "@/lib/format";

export default async function AdminOverviewPage() {
  const [
    kycPending,
    kycTotal,
    usersTotal,
    openProducts,
    pendingPayment,
    recentSubs,
  ] = await Promise.all([
    prisma.kYC.count({ where: { status: "SUBMITTED" } }),
    prisma.kYC.count(),
    prisma.user.count({ where: { role: "CLIENT" } }),
    prisma.product.count({ where: { status: "OPEN" } }),
    prisma.subscription.count({ where: { status: "PENDING_PAYMENT" } }),
    prisma.subscription.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, phoneNumber: true } },
        product: { select: { code: true, type: true, currency: true } },
      },
    }),
  ]);

  const STATS = [
    { label: "KYC en attente", value: kycPending, sub: `${kycTotal} dossiers au total`, color: "bg-amber-50 border-amber-100", icon: "🪪", href: "/admin/kyc" },
    { label: "Utilisateurs (clients)", value: usersTotal, sub: "Comptes actifs", color: "bg-blue-50 border-blue-100", icon: "👥", href: "/admin/users" },
    { label: "Produits ouverts", value: openProducts, sub: "Disponibles à la souscription", color: "bg-emerald-50 border-emerald-100", icon: "📋", href: "/admin/products" },
    { label: "Paiements en attente", value: pendingPayment, sub: "À confirmer", color: "bg-violet-50 border-violet-100", icon: "💳", href: "/admin/subscriptions" },
  ];

  const SUB_STATUS: Record<string, string> = {
    PENDING_PAYMENT: "bg-amber-100 text-amber-700",
    PAYMENT_CONFIRMED: "bg-blue-100 text-blue-700",
    SUBMITTED: "bg-indigo-100 text-indigo-700",
    ADJUDICATED: "bg-emerald-100 text-emerald-700",
    ACTIVE: "bg-emerald-100 text-emerald-700",
    CANCELLED: "bg-red-100 text-red-600",
    FAILED: "bg-red-100 text-red-600",
    REIMBURSED: "bg-slate-100 text-slate-600",
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Vue d&apos;ensemble</h1>
        <p className="text-sm text-muted-foreground mt-1">Tableau de bord de l&apos;administration ekonzo</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((s) => (
          <Link key={s.label} href={s.href} className={`rounded-xl border p-5 ${s.color} hover:shadow-sm transition-shadow`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{s.label}</p>
                <p className="mt-1.5 text-3xl font-bold tracking-tight">{s.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.sub}</p>
              </div>
              <span className="text-2xl">{s.icon}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* KYC alert */}
      {kycPending > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚡</span>
            <div>
              <p className="font-semibold text-sm text-amber-800">{kycPending} dossier{kycPending > 1 ? "s" : ""} KYC en attente de traitement</p>
              <p className="text-xs text-amber-700 mt-0.5">Traitez les dossiers pour permettre aux utilisateurs d&apos;investir.</p>
            </div>
          </div>
          <Link href="/admin/kyc" className="flex-shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition-colors">
            Traiter →
          </Link>
        </div>
      )}

      {/* Recent subscriptions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Souscriptions récentes</h2>
          <Link href="/admin/subscriptions" className="text-xs text-primary hover:underline">Voir toutes →</Link>
        </div>

        {recentSubs.length === 0 ? (
          <div className="rounded-xl border bg-white p-8 text-center text-sm text-muted-foreground">
            Aucune souscription pour le moment.
          </div>
        ) : (
          <div className="rounded-xl border bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-medium">Investisseur</th>
                  <th className="text-left px-4 py-3 font-medium">Produit</th>
                  <th className="text-left px-4 py-3 font-medium">Montant</th>
                  <th className="text-left px-4 py-3 font-medium">Statut</th>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recentSubs.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm">{s.user.name}</p>
                      <p className="text-xs text-muted-foreground">{s.user.phoneNumber}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold mr-1 bg-blue-100 text-blue-700">BT</span>
                      <span className="font-mono text-xs">{s.product.code}</span>
                    </td>
                    <td className="px-4 py-3 font-medium">{formatAmount(s.amount.toString(), s.product.currency)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${SUB_STATUS[s.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {s.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(s.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
