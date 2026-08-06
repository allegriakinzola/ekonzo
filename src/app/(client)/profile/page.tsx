import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";

const KYC_STATUS: Record<string, { label: string; color: string; icon: string }> = {
  PENDING:      { label: "Non soumis",          color: "text-slate-500",   icon: "○" },
  SUBMITTED:    { label: "En cours de vérif.",  color: "text-blue-600",    icon: "⏳" },
  UNDER_REVIEW: { label: "En révision",         color: "text-indigo-600",  icon: "🔍" },
  VERIFIED:     { label: "Vérifié",             color: "text-emerald-600", icon: "✓" },
  APPROVED:     { label: "Approuvé",            color: "text-emerald-600", icon: "✓" },
  REJECTED:     { label: "Rejeté",              color: "text-red-600",     icon: "✗" },
};

export default async function ProfilePage() {
  const session = await requireRole("CLIENT");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      phoneNumber: true,
      email: true,
      kycStatus: true,
      createdAt: true,
      kyc: {
        select: {
          firstName: true, lastName: true, postName: true,
          docType: true, status: true, submittedAt: true, verifiedAt: true,
        },
      },
      wallets: { select: { currency: true, balance: true } },
      _count: { select: { subscriptions: true } },
    },
  });

  if (!user) return null;

  const kycInfo = KYC_STATUS[user.kycStatus] ?? KYC_STATUS.PENDING;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mon profil</h1>
        <p className="text-sm text-muted-foreground mt-1">Informations de votre compte ekonzo</p>
      </div>

      {/* Identity card */}
      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="flex items-center gap-4 px-6 py-5 border-b bg-slate-50">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white text-xl font-bold flex-shrink-0">
            {user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
          </div>
          <div>
            <p className="text-lg font-bold">{user.name}</p>
            <p className={`text-sm font-medium ${kycInfo.color}`}>{kycInfo.icon} {kycInfo.label}</p>
          </div>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Numéro de téléphone" value={user.phoneNumber ?? "—"} />
          <Field label="Email" value={user.email ?? "—"} />
          <Field label="Membre depuis" value={formatDate(user.createdAt)} />
          <Field label="Souscriptions" value={`${user._count.subscriptions} au total`} />
        </div>
      </div>

      {/* KYC details */}
      {user.kyc && (
        <div className="rounded-xl border bg-white overflow-hidden">
          <div className="px-6 py-4 border-b bg-slate-50">
            <p className="font-semibold text-sm">Vérification d&apos;identité (KYC)</p>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Prénom" value={user.kyc.firstName} />
            <Field label="Nom" value={user.kyc.lastName} />
            {user.kyc.postName && <Field label="Post-nom" value={user.kyc.postName} />}
            <Field label="Type de document" value={DOC_LABELS[user.kyc.docType] ?? user.kyc.docType} />
            <Field label="Soumis le" value={formatDate(user.kyc.submittedAt)} />
            {user.kyc.verifiedAt && <Field label="Vérifié le" value={formatDate(user.kyc.verifiedAt)} />}
            <Field
              label="Statut"
              value={KYC_STATUS[user.kyc.status]?.label ?? user.kyc.status}
              highlight={user.kyc.status === "VERIFIED" || user.kyc.status === "APPROVED"}
            />
          </div>
        </div>
      )}

      {/* Security note */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-muted-foreground">
        🔒 Pour modifier vos informations personnelles ou votre mot de passe, contactez le support ekonzo.
      </div>
    </div>
  );
}

const DOC_LABELS: Record<string, string> = {
  CNI: "Carte Nationale d'Identité",
  PASSPORT: "Passeport",
  PERMIS: "Permis de conduire",
};

function Field({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
      <p className={`text-sm font-semibold mt-0.5 ${highlight ? "text-emerald-600" : ""}`}>{value}</p>
    </div>
  );
}
