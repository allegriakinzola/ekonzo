import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { formatAmount, formatDate } from "@/lib/format";
import { ProductDetailActions } from "./ProductDetailActions";

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

const STATUS_TRANSITIONS: Record<string, string> = {
  DRAFT: "OPEN", OPEN: "CLOSED", CLOSED: "ADJUDICATED",
  ADJUDICATED: "ACTIVE", ACTIVE: "MATURED",
};

const SUB_STATUS: Record<string, string> = {
  PENDING_PAYMENT:       "bg-amber-100 text-amber-700",
  PAYMENT_CONFIRMED:     "bg-blue-100 text-blue-700",
  SUBMITTED:             "bg-indigo-100 text-indigo-700",
  ADJUDICATED:           "bg-emerald-100 text-emerald-700",
  ACTIVE:                "bg-emerald-100 text-emerald-700",
  CANCELLED:             "bg-red-100 text-red-600",
  FAILED:                "bg-red-100 text-red-600",
  REIMBURSED:            "bg-slate-100 text-slate-600",
};

const SUB_LABELS: Record<string, string> = {
  PENDING_PAYMENT:   "Paiement attendu",
  PAYMENT_CONFIRMED: "Paiement confirmé",
  SUBMITTED:         "Soumis",
  ADJUDICATED:       "Adjugé",
  ACTIVE:            "Actif",
  CANCELLED:         "Annulé",
  FAILED:            "Échoué",
  REIMBURSED:        "Remboursé",
};

export default async function AdminProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["ADMIN", "SUPER_ADMIN"]);
  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      subscriptions: {
        include: {
          user: { select: { name: true, phoneNumber: true } },
          momoAccount: { select: { operator: true, phoneNumber: true } },
          bankAccount: { select: { bankName: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!product) notFound();

  const volumeLeft = Number(product.totalVolume) - Number(product.allocatedVolume);
  const pct = Math.round((Number(product.allocatedVolume) / Number(product.totalVolume)) * 100);
  const nextStatus = STATUS_TRANSITIONS[product.status];

  const totalAmount = product.subscriptions.reduce((sum, s) => sum + Number(s.amount), 0);
  const confirmedAmount = product.subscriptions
    .filter((s) => ["PAYMENT_CONFIRMED", "SUBMITTED", "ADJUDICATED", "ACTIVE"].includes(s.status))
    .reduce((sum, s) => sum + Number(s.amount), 0);

  const INFO_GRID = [
    ["Code", product.code],
    ["Devise", product.currency],
    ["Valeur nominale", formatAmount(product.faceValue.toString(), product.currency)],
    ["Ticket minimum", formatAmount(product.minTicket.toString(), product.currency)],
    ["Taux d'escompte", product.discountRate ? `${(Number(product.discountRate) * 100).toFixed(2)} %` : "—"],
    ["Volume total", formatAmount(product.totalVolume.toString(), product.currency)],
    ["Volume alloué", formatAmount(product.allocatedVolume.toString(), product.currency)],
    ["Date d'émission", formatDate(product.issuanceDate)],
    ["Clôture souscription", formatDate(product.subscriptionDeadline)],
    ["Date d'adjudication", formatDate(product.adjudicationDate)],
    ["Date de maturité", formatDate(product.maturityDate)],
    ["Créé le", formatDate(product.createdAt)],
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin/products" className="hover:text-foreground">Produits</Link>
        <span>/</span>
        <span className="text-foreground font-medium">{product.code}</span>
      </div>

      {/* Header */}
      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b bg-slate-50">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700">
                Bon du Trésor
              </span>
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[product.status] ?? ""}`}>
                {STATUS_LABELS[product.status] ?? product.status}
              </span>
            </div>
            <h1 className="text-2xl font-bold">{product.code}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Émis le {formatDate(product.issuanceDate)} · Maturité le {formatDate(product.maturityDate)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground mb-0.5">Taux d&apos;escompte</p>
            <p className="text-3xl font-bold text-primary">
              {product.discountRate ? `${(Number(product.discountRate) * 100).toFixed(2)} %` : "—"}
            </p>
          </div>
        </div>

        {/* Volume bar */}
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between mb-2 text-xs">
            <span className="text-muted-foreground">Volume souscrit</span>
            <span className="font-semibold">{pct}% · {formatAmount(product.allocatedVolume.toString(), product.currency)} / {formatAmount(product.totalVolume.toString(), product.currency)}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">{formatAmount(volumeLeft.toString(), product.currency)} disponible</p>
        </div>

        {/* Fiche technique */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-6">
          {INFO_GRID.map(([label, value]) => (
            <div key={label} className="rounded-lg bg-slate-50 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
              <p className="text-sm font-semibold mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Actions de statut */}
      {nextStatus && (
        <ProductDetailActions
          productId={product.id}
          currentStatus={product.status}
          nextStatus={nextStatus}
          nextLabel={STATUS_LABELS[nextStatus]}
        />
      )}

      {/* Statistiques souscriptions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total souscriptions", value: product.subscriptions.length.toString(), color: "bg-slate-50" },
          { label: "Montant total souscrit", value: formatAmount(totalAmount.toString(), product.currency), color: "bg-blue-50" },
          { label: "Montant confirmé", value: formatAmount(confirmedAmount.toString(), product.currency), color: "bg-emerald-50" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.color}`}>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{s.label}</p>
            <p className="text-xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Liste des souscriptions */}
      <div>
        <h2 className="text-base font-semibold mb-4">Souscriptions ({product.subscriptions.length})</h2>
        {product.subscriptions.length === 0 ? (
          <div className="rounded-xl border bg-white p-10 text-center text-sm text-muted-foreground">
            Aucune souscription sur ce produit.
          </div>
        ) : (
          <div className="rounded-xl border bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-medium">Investisseur</th>
                  <th className="text-left px-4 py-3 font-medium">Montant</th>
                  <th className="text-left px-4 py-3 font-medium">Canal</th>
                  <th className="text-left px-4 py-3 font-medium">Statut</th>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {product.subscriptions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium">{s.user.name}</p>
                      <p className="text-xs text-muted-foreground">{s.user.phoneNumber}</p>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {formatAmount(s.amount.toString(), product.currency)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {s.paymentChannel === "MOBILE_MONEY"
                        ? `${s.momoAccount?.operator ?? "MoMo"} · ${s.momoAccount?.phoneNumber ?? ""}`
                        : `Virement · ${s.bankAccount?.bankName ?? ""}`}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${SUB_STATUS[s.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {SUB_LABELS[s.status] ?? s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDate(s.createdAt)}
                    </td>
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
