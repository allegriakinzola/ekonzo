import Link from "next/link";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatAmount, formatDate, daysUntil } from "@/lib/format";

export default async function ProductsPage() {
  const session = await requireRole("CLIENT");

  const freshUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { kycStatus: true },
  });
  const kycVerified = freshUser?.kycStatus === "VERIFIED";

  const products = await prisma.product.findMany({
    where: { status: { in: ["OPEN"] } },
    orderBy: { subscriptionDeadline: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Produits disponibles</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Bons du Trésor émis par le Ministère des Finances · RDC
        </p>
      </div>

      {!kycVerified && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <span className="text-lg mt-0.5">🪪</span>
          <div>
            <p className="font-semibold text-sm text-amber-800">Vérification d&apos;identité requise</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Vous devez compléter votre KYC avant de pouvoir souscrire à un produit.{" "}
              <Link href="/kyc" className="underline font-medium">Vérifier maintenant →</Link>
            </p>
          </div>
        </div>
      )}

      {products.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center">
          <p className="text-4xl mb-4">📋</p>
          <p className="font-semibold text-base">Aucun produit ouvert pour le moment</p>
          <p className="text-sm text-muted-foreground mt-2">
            Les prochaines émissions de Bons du Trésor apparaîtront ici.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {products.map((p) => {
            const days = daysUntil(p.subscriptionDeadline);
            const rate = p.discountRate;
            const rateLabel = "Taux d'escompte";
            const volumeLeft = Number(p.totalVolume) - Number(p.allocatedVolume);
            const pct = Math.round((Number(p.allocatedVolume) / Number(p.totalVolume)) * 100);

            return (
              <div key={p.id} className="rounded-xl border bg-white overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b bg-slate-50">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700">
                      Bon du Trésor
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">{p.code}</span>
                  </div>
                  {days <= 3 ? (
                    <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-full px-2.5 py-0.5">
                      ⚡ {days}j restant{days > 1 ? "s" : ""}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">{days}j restants</span>
                  )}
                </div>

                {/* Body */}
                <div className="p-5 flex-1 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Stat label="Valeur nominale" value={formatAmount(p.faceValue.toString(), p.currency)} />
                    <Stat label="Ticket minimum" value={formatAmount(p.minTicket.toString(), p.currency)} />
                    <Stat label={rateLabel} value={rate ? `${(Number(rate) * 100).toFixed(2)} %` : "—"} highlight />
                    <Stat label="Devise" value={p.currency} />
                    <Stat label="Émission" value={formatDate(p.issuanceDate)} />
                    <Stat label="Maturité" value={formatDate(p.maturityDate)} />
                  </div>

                  {/* Volume bar */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-muted-foreground">Volume disponible</span>
                      <span className="text-xs font-medium">{pct}% alloué</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatAmount(volumeLeft.toString(), p.currency)} disponibles
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-5 pb-5">
                  {kycVerified ? (
                    <Link
                      href={`/products/${p.id}`}
                      className="flex items-center justify-center w-full h-10 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
                    >
                      Souscrire →
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="w-full h-10 rounded-lg bg-slate-100 text-muted-foreground text-sm font-medium cursor-not-allowed"
                    >
                      KYC requis pour souscrire
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
      <p className={`text-sm font-semibold mt-0.5 ${highlight ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}
