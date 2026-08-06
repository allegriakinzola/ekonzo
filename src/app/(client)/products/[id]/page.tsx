import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatAmount, formatDate, daysUntil } from "@/lib/format";
import { SubscribeForm } from "./SubscribeForm";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireRole("CLIENT");

  const freshUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { kycStatus: true },
  });

  if (freshUser?.kycStatus !== "VERIFIED") {
    redirect("/kyc");
  }

  const p = await prisma.product.findUnique({ where: { id } });
  if (!p || p.status !== "OPEN") notFound();

  const days = daysUntil(p.subscriptionDeadline);
  const rate = p.discountRate;
  const rateLabel = "Taux d'escompte";
  const volumeLeft = Number(p.totalVolume) - Number(p.allocatedVolume);
  const pct = Math.round((Number(p.allocatedVolume) / Number(p.totalVolume)) * 100);

  const productForForm = {
    id: p.id,
    type: p.type,
    currency: p.currency,
    faceValue: p.faceValue.toString(),
    minTicket: p.minTicket.toString(),
    discountRate: p.discountRate?.toString() ?? null,
    couponRate: p.couponRate?.toString() ?? null,
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/products" className="hover:text-foreground">Produits</Link>
        <span>/</span>
        <span className="text-foreground font-medium">{p.code}</span>
      </div>

      {/* Header */}
      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b bg-slate-50">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700">
                Bon du Trésor
              </span>
            </div>
            <h1 className="text-xl font-bold">{p.code}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Émis le {formatDate(p.issuanceDate)} · Maturité le {formatDate(p.maturityDate)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-primary">
              {rate ? `${(Number(rate) * 100).toFixed(2)} %` : "—"}
            </p>
            <p className="text-xs text-muted-foreground">{rateLabel}</p>
          </div>
        </div>

        <div className="p-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
          <DetailStat label="Valeur nominale" value={formatAmount(p.faceValue.toString(), p.currency)} />
          <DetailStat label="Ticket minimum" value={formatAmount(p.minTicket.toString(), p.currency)} />
          <DetailStat label="Devise" value={p.currency} />
          <DetailStat label="Date adjudication" value={formatDate(p.adjudicationDate)} />
          <DetailStat label="Clôture souscription" value={formatDate(p.subscriptionDeadline)} />
          <DetailStat
            label="Délai restant"
            value={`${days} jour${days > 1 ? "s" : ""}`}
            highlight={days <= 3}
          />
          <DetailStat label="Volume total" value={formatAmount(p.totalVolume.toString(), p.currency)} />
          <DetailStat label="Volume disponible" value={formatAmount(volumeLeft.toString(), p.currency)} />
        </div>

        {/* Volume bar */}
        <div className="px-6 pb-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground">Allocation</span>
            <span className="text-xs font-medium">{pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {/* Subscribe form */}
      <SubscribeForm product={productForForm} />
    </div>
  );
}

const FREQ_LABELS: Record<string, string> = {
  MONTHLY: "Mensuelle",
  QUARTERLY: "Trimestrielle",
  SEMI_ANNUAL: "Semestrielle",
  ANNUAL: "Annuelle",
  AT_MATURITY: "À maturité",
};

function DetailStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
      <p className={`text-sm font-semibold mt-0.5 ${highlight ? "text-red-600" : ""}`}>{value}</p>
    </div>
  );
}
