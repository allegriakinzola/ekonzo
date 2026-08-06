import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { KycFlow } from "./KycFlow";

const DOC_LABELS: Record<string, string> = {
  CNI: "Carte d'identité",
  PASSPORT: "Passeport",
  PERMIS: "Permis de conduire",
};

export default async function KycPage() {
  const session = await requireRole("CLIENT");

  const kyc = await prisma.kYC.findUnique({
    where: { userId: session.user.id },
  });

  // ✅ Vérifié — informations en lecture seule, non modifiables
  if (kyc?.status === "VERIFIED") {
    const INFO = [
      ["Type de document", DOC_LABELS[kyc.docType] ?? kyc.docType],
      ["Nom", kyc.lastName],
      ["Post-nom", kyc.postName ?? "—"],
      ["Prénom", kyc.firstName],
      ["Date de naissance", kyc.dateOfBirth ?? "—"],
      ["N° du document", kyc.docNumber ?? "—"],
      ["Adresse", kyc.address ?? "—"],
    ];
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Identité vérifiée</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Vos informations ont été validées et ne peuvent plus être modifiées.
          </p>
        </div>

        <div className="rounded-xl border bg-white overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b bg-emerald-50">
            <span className="text-2xl">✅</span>
            <div>
              <p className="font-semibold text-sm text-emerald-800">Compte vérifié</p>
              <p className="text-xs text-emerald-700">
                Validé le {kyc.verifiedAt ? new Date(kyc.verifiedAt).toLocaleDateString("fr-CD") : "—"}
              </p>
            </div>
          </div>
          <div className="divide-y">
            {INFO.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between px-5 py-3">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="text-sm font-medium">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Pour toute correction, contactez le support ekonzo.
        </p>
      </div>
    );
  }

  // ⏳ Soumis — en attente de revue admin
  if (kyc?.status === "SUBMITTED" || kyc?.status === "UNDER_REVIEW") {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="rounded-xl border bg-white p-10 text-center space-y-3">
          <p className="text-4xl">⏳</p>
          <h1 className="text-xl font-bold">Dossier en cours d&apos;examen</h1>
          <p className="text-sm text-muted-foreground">
            Votre visage n&apos;a pas pu être vérifié automatiquement. Un agent examine
            votre dossier — réponse sous 24 à 48h.
          </p>
        </div>
      </div>
    );
  }

  // ❌ Rejeté ou jamais soumis — (re)faire le parcours
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Vérification d&apos;identité</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {kyc?.status === "REJECTED"
            ? "Votre dossier a été rejeté — recommencez la vérification."
            : "Complétez votre vérification pour pouvoir investir."}
        </p>
      </div>
      {kyc?.status === "REJECTED" && kyc.rejectedNote && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          Motif du rejet : {kyc.rejectedNote}
        </div>
      )}
      <KycFlow />
    </div>
  );
}
