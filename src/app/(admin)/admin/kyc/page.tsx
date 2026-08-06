"use client";

import { useEffect, useState } from "react";

interface KycRecord {
  id: string;
  status: string;
  docType: string;
  firstName: string;
  lastName: string;
  postName: string | null;
  docFrontUrl: string;
  docBackUrl: string;
  selfieUrl: string;
  rejectedNote: string | null;
  submittedAt: string;
  user: {
    id: string;
    name: string;
    phoneNumber: string;
  };
}

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED:    "bg-amber-100 text-amber-700",
  VERIFIED:     "bg-emerald-100 text-emerald-700",
  REJECTED:     "bg-red-100 text-red-600",
  PENDING:      "bg-slate-100 text-slate-600",
  UNDER_REVIEW: "bg-indigo-100 text-indigo-700",
};

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED:    "Soumis",
  VERIFIED:     "Vérifié",
  REJECTED:     "Rejeté",
  PENDING:      "En attente",
  UNDER_REVIEW: "En révision",
};

const DOC_LABELS: Record<string, string> = {
  CNI:      "Carte Nationale d'Identité",
  PASSPORT: "Passeport",
  PERMIS:   "Permis de conduire",
};

export default function AdminKycPage() {
  const [kycs, setKycs] = useState<KycRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKyc, setSelectedKyc] = useState<KycRecord | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [acting, setActing] = useState(false);

  async function load(status = "SUBMITTED") {
    setLoading(true);
    const res = await fetch(`/api/admin/kyc?status=${status}`);
    const data = await res.json();
    setKycs(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAction(kycId: string, action: "approve" | "reject") {
    if (action === "reject" && !rejectReason.trim()) {
      alert("Veuillez saisir un motif de rejet.");
      return;
    }
    setActing(true);
    await fetch(`/api/admin/kyc/${kycId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason: rejectReason }),
    });
    setSelectedKyc(null);
    setRejectReason("");
    setActing(false);
    load();
  }

  function fileUrl(absPath: string, userId: string) {
    const filename = absPath.split(/[\\/]/).pop();
    return `/api/kyc/file/${userId}/${filename}`;
  }

  const FILTER_TABS = ["SUBMITTED", "VERIFIED", "REJECTED"] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vérifications KYC</h1>
          <p className="text-sm text-muted-foreground mt-1">Traitement des dossiers d&apos;identité</p>
        </div>
        <div className="flex gap-2">
          {FILTER_TABS.map((s) => (
            <button
              key={s}
              onClick={() => load(s)}
              className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-slate-50 transition-colors"
            >
              {STATUS_LABELS[s] ?? s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">Chargement…</div>
      ) : kycs.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center">
          <p className="text-3xl mb-3">✅</p>
          <p className="font-medium text-sm">Aucun dossier dans ce statut</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-xs text-muted-foreground uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-medium">Utilisateur</th>
                <th className="text-left px-4 py-3 font-medium">Document</th>
                <th className="text-left px-4 py-3 font-medium">Soumis le</th>
                <th className="text-left px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {kycs.map((kyc) => (
                <tr key={kyc.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium">{kyc.user.name}</p>
                    <p className="text-xs text-muted-foreground">{kyc.user.phoneNumber}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs">{DOC_LABELS[kyc.docType] ?? kyc.docType}</p>
                    <p className="text-xs text-muted-foreground">{kyc.firstName} {kyc.lastName}{kyc.postName ? ` ${kyc.postName}` : ""}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(kyc.submittedAt).toLocaleDateString("fr-CD")}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[kyc.status] ?? ""}`}>
                      {STATUS_LABELS[kyc.status] ?? kyc.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelectedKyc(kyc)}
                      className="rounded-lg border px-3 py-1 text-xs font-medium hover:bg-slate-100 transition-colors"
                    >
                      Examiner
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {selectedKyc && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b">
              <div>
                <h2 className="font-bold text-lg">{selectedKyc.user.name}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{selectedKyc.user.phoneNumber}</p>
              </div>
              <button onClick={() => setSelectedKyc(null)} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-muted-foreground transition-colors text-lg">✕</button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Type de document", DOC_LABELS[selectedKyc.docType] ?? selectedKyc.docType],
                  ["Prénom", selectedKyc.firstName],
                  ["Nom", selectedKyc.lastName],
                  ["Post-nom", selectedKyc.postName ?? "—"],
                  ["Soumis le", new Date(selectedKyc.submittedAt).toLocaleDateString("fr-CD")],
                  ["Statut", STATUS_LABELS[selectedKyc.status] ?? selectedKyc.status],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-slate-50 px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
                    <p className="text-sm font-semibold mt-0.5">{value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Recto", url: fileUrl(selectedKyc.docFrontUrl, selectedKyc.user.id) },
                  { label: "Verso", url: fileUrl(selectedKyc.docBackUrl, selectedKyc.user.id) },
                  { label: "Selfie", url: fileUrl(selectedKyc.selfieUrl, selectedKyc.user.id) },
                ].map(({ label, url }) => (
                  <div key={label} className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">{label}</p>
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      <img src={url} alt={label} className="w-full rounded-lg border object-cover h-36 hover:opacity-90 transition-opacity cursor-zoom-in" />
                    </a>
                  </div>
                ))}
              </div>

              {selectedKyc.rejectedNote && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  <span className="font-medium">Motif de rejet :</span> {selectedKyc.rejectedNote}
                </div>
              )}

              {selectedKyc.status === "SUBMITTED" && (
                <div className="space-y-3 pt-2 border-t">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Motif de rejet (obligatoire si refus)</label>
                    <input
                      type="text"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Ex : Document flou, photo illisible, nom incohérent…"
                      className="w-full h-10 rounded-lg border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleAction(selectedKyc.id, "approve")}
                      disabled={acting}
                      className="flex-1 h-10 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                    >
                      {acting ? "…" : "✓ Approuver"}
                    </button>
                    <button
                      onClick={() => handleAction(selectedKyc.id, "reject")}
                      disabled={acting}
                      className="flex-1 h-10 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      {acting ? "…" : "✕ Rejeter"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
