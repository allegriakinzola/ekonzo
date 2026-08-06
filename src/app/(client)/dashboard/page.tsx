import Link from "next/link";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatAmount, formatDate, daysUntil } from "@/lib/format";

const QUICK_ACTIONS = [
  { href: "/products", label: "Souscrire à un produit", desc: "Bons du Trésor disponibles", icon: "➕" },
  { href: "/portfolio", label: "Mon portefeuille", desc: "Suivi de vos placements et rendements", icon: "📊" },
  { href: "/kyc", label: "Vérification d'identité", desc: "Activez votre compte pour investir", icon: "🪪" },
];

export default async function DashboardPage() {
  const session = await requireRole("CLIENT");
  const userName = session.user.name ?? "Utilisateur";
  const firstName = userName.split(" ")[0];

  const freshUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { kycStatus: true },
  });
  const kycStatus = freshUser?.kycStatus ?? "PENDING";

  const [kycRecord, subscriptions, wallets, openProducts] = await Promise.all([
    kycStatus !== "VERIFIED"
      ? prisma.kYC.findUnique({ where: { userId: session.user.id }, select: { status: true } }).catch(() => null)
      : null,
    prisma.subscription.findMany({
      where: { userId: session.user.id },
      include: { product: { select: { maturityDate: true, currency: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.wallet.findMany({ where: { userId: session.user.id } }),
    prisma.product.findMany({
      where: { status: "OPEN" },
      orderBy: { subscriptionDeadline: "asc" },
      take: 4,
    }),
  ]);

  const kycSubmitted = kycRecord?.status === "SUBMITTED";

  // Calcul des stats réelles
  const activeOrAdjudicated = subscriptions.filter((s) =>
    ["ADJUDICATED", "ACTIVE", "PAYMENT_CONFIRMED", "SUBMITTED"].includes(s.status)
  );
  const totalInvested = activeOrAdjudicated.reduce((sum, s) => sum + Number(s.adjudicatedAmount ?? s.amount), 0);
  const activeCurrency = activeOrAdjudicated[0]?.currency ?? "USD";

  const nextMaturity = activeOrAdjudicated
    .map((s) => s.product.maturityDate)
    .filter(Boolean)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];

  const walletCdf = wallets.find((w) => w.currency === "CDF");
  const walletUsd = wallets.find((w) => w.currency === "USD");

  const STAT_CARDS = [
    {
      label: "Capital investi",
      value: totalInvested > 0 ? formatAmount(totalInvested.toString(), activeCurrency) : "0,00 " + activeCurrency,
      sub: activeOrAdjudicated.length > 0 ? `${activeOrAdjudicated.length} placement${activeOrAdjudicated.length > 1 ? "s" : ""} actif${activeOrAdjudicated.length > 1 ? "s" : ""}` : "Aucun placement actif",
      color: "bg-blue-50 border-blue-100",
      iconBg: "bg-blue-100",
      icon: "💼",
    },
    {
      label: "Souscriptions",
      value: subscriptions.length.toString(),
      sub: `${subscriptions.filter((s) => s.status === "PENDING_PAYMENT").length} en attente de paiement`,
      color: "bg-emerald-50 border-emerald-100",
      iconBg: "bg-emerald-100",
      icon: "📈",
    },
    {
      label: "Prochaine échéance",
      value: nextMaturity ? formatDate(nextMaturity) : "—",
      sub: nextMaturity ? `Dans ${daysUntil(nextMaturity)} jours` : "Aucune souscription active",
      color: "bg-violet-50 border-violet-100",
      iconBg: "bg-violet-100",
      icon: "📅",
    },
    {
      label: "Wallet CDF",
      value: walletCdf ? formatAmount(walletCdf.balance.toString(), "CDF") : "0,00 CDF",
      sub: walletUsd ? `USD : ${formatAmount(walletUsd.balance.toString(), "USD")}` : "Wallet USD vide",
      color: "bg-amber-50 border-amber-100",
      iconBg: "bg-amber-100",
      icon: "💳",
    },
  ];

  return (
    <div className="space-y-8">
      {/* En-tête de bienvenue */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Bonjour, {firstName} 👋
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Bienvenue sur votre espace investisseur ekonzo.
          </p>
        </div>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors shadow-sm"
        >
          <span>+</span> Nouveau placement
        </Link>
      </div>

      {/* Bannière KYC */}
      {kycStatus !== "VERIFIED" && (
        <div className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center gap-4 ${
          kycSubmitted
            ? "bg-blue-50 border-blue-200"
            : "bg-amber-50 border-amber-200"
        }`}>
          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xl ${
            kycSubmitted ? "bg-blue-100" : "bg-amber-100"
          }`}>
            {kycSubmitted ? "⏳" : "🪪"}
          </div>
          <div className="flex-1">
            <p className={`font-semibold text-sm ${kycSubmitted ? "text-blue-800" : "text-amber-800"}`}>
              {kycSubmitted
                ? "Dossier KYC en cours de vérification"
                : "Vérifiez votre identité pour investir"}
            </p>
            <p className={`text-xs mt-0.5 ${kycSubmitted ? "text-blue-700" : "text-amber-700"}`}>
              {kycSubmitted
                ? "Votre dossier a été soumis. Un agent va vérifier vos documents sous 24–48h."
                : "La loi exige la vérification d'identité avant toute souscription. Cela prend moins de 5 minutes."}
            </p>
          </div>
          {!kycSubmitted && (
            <Link
              href="/kyc"
              className="flex-shrink-0 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 transition-colors"
            >
              Vérifier maintenant →
            </Link>
          )}
        </div>
      )}

      {/* Cartes statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((card) => (
          <div key={card.label} className={`rounded-xl border p-5 ${card.color}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{card.label}</p>
                <p className="mt-1.5 text-xl font-bold tracking-tight">{card.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{card.sub}</p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg ${card.iconBg}`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Actions rapides */}
      <div>
        <h2 className="text-base font-semibold mb-4">Actions rapides</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group rounded-xl border bg-white p-5 hover:border-primary/40 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{action.icon}</span>
                <p className="font-semibold text-sm group-hover:text-primary transition-colors">{action.label}</p>
              </div>
              <p className="text-xs text-muted-foreground">{action.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Produits ouverts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Bons du Trésor disponibles</h2>
          <Link href="/products" className="text-xs text-primary hover:underline">Voir tous →</Link>
        </div>
        {openProducts.length === 0 ? (
          <div className="rounded-xl border bg-white p-8 text-center">
            <p className="text-3xl mb-3">📋</p>
            <p className="font-medium text-sm">Aucun produit ouvert pour le moment</p>
            <p className="text-xs text-muted-foreground mt-1">
              Les prochaines émissions de Bons du Trésor apparaîtront ici.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {openProducts.map((p) => {
              const days = daysUntil(p.subscriptionDeadline);
              const rate = p.discountRate;
              const volumeLeft = Number(p.totalVolume) - Number(p.allocatedVolume);
              const pct = Math.round((Number(p.allocatedVolume) / Number(p.totalVolume)) * 100);
              return (
                <Link
                  key={p.id}
                  href={kycStatus === "VERIFIED" ? `/products/${p.id}` : "/kyc"}
                  className="rounded-xl border bg-white overflow-hidden hover:border-primary/40 hover:shadow-sm transition-all flex flex-col"
                >
                  <div className="flex items-center justify-between px-5 py-3 border-b bg-slate-50">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-700">Bon du Trésor</span>
                      <span className="text-xs font-mono text-muted-foreground">{p.code}</span>
                    </div>
                    <span className={`text-xs font-medium ${days <= 3 ? "text-red-600" : "text-muted-foreground"}`}>
                      {days <= 3 ? `⚡ ${days}j` : `${days}j restants`}
                    </span>
                  </div>
                  <div className="p-4 flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Taux d&apos;escompte</p>
                        <p className="text-2xl font-bold text-primary">
                          {rate ? `${(Number(rate) * 100).toFixed(2)} %` : "—"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Valeur nominale</p>
                        <p className="text-sm font-semibold">{formatAmount(p.faceValue.toString(), p.currency)}</p>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-2">
                      <span>Maturité : {formatDate(p.maturityDate)}</span>
                      <span>{p.currency}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-primary/60" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">{formatAmount(volumeLeft.toString(), p.currency)} disponible</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
