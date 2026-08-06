import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { formatDate } from "@/lib/format";

const KYC_COLORS: Record<string, string> = {
  PENDING:      "bg-slate-100 text-slate-600",
  SUBMITTED:    "bg-amber-100 text-amber-700",
  UNDER_REVIEW: "bg-indigo-100 text-indigo-700",
  VERIFIED:     "bg-emerald-100 text-emerald-700",
  APPROVED:     "bg-emerald-100 text-emerald-700",
  REJECTED:     "bg-red-100 text-red-600",
};

const KYC_LABELS: Record<string, string> = {
  PENDING:      "Non soumis",
  SUBMITTED:    "En attente",
  UNDER_REVIEW: "En révision",
  VERIFIED:     "Vérifié",
  APPROVED:     "Approuvé",
  REJECTED:     "Rejeté",
};

const ROLE_COLORS: Record<string, string> = {
  CLIENT:      "bg-slate-100 text-slate-700",
  ADMIN:       "bg-violet-100 text-violet-700",
  SUPER_ADMIN: "bg-primary/10 text-primary",
};

export default async function AdminUsersPage() {
  await requireRole(["ADMIN", "SUPER_ADMIN"]);

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      phoneNumber: true,
      email: true,
      role: true,
      kycStatus: true,
      banned: true,
      createdAt: true,
      _count: { select: { subscriptions: true } },
    },
  });

  const kycVerified = users.filter((u) => u.kycStatus === "VERIFIED").length;
  const kycPending  = users.filter((u) => u.kycStatus === "SUBMITTED").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Utilisateurs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {users.length} compte{users.length > 1 ? "s" : ""} · {kycVerified} vérifiés · {kycPending} en attente KYC
          </p>
        </div>
      </div>

      {users.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center text-sm text-muted-foreground">
          Aucun utilisateur.
        </div>
      ) : (
        <div className="rounded-xl border bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-medium">Utilisateur</th>
                  <th className="text-left px-4 py-3 font-medium">Téléphone</th>
                  <th className="text-left px-4 py-3 font-medium">Rôle</th>
                  <th className="text-left px-4 py-3 font-medium">KYC</th>
                  <th className="text-left px-4 py-3 font-medium">Souscriptions</th>
                  <th className="text-left px-4 py-3 font-medium">Inscrit le</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((u) => (
                  <tr key={u.id} className={`hover:bg-slate-50 transition-colors ${u.banned ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                          {u.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium leading-tight">{u.name}</p>
                          {u.banned && <p className="text-xs text-red-500">Banni</p>}
                          {u.email && <p className="text-xs text-muted-foreground">{u.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{u.phoneNumber ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[u.role] ?? ""}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${KYC_COLORS[u.kycStatus] ?? ""}`}>
                        {KYC_LABELS[u.kycStatus] ?? u.kycStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-sm font-semibold ${u._count.subscriptions > 0 ? "text-primary" : "text-muted-foreground"}`}>
                        {u._count.subscriptions}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
