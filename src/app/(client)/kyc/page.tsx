import {
  CheckCircleIcon,
  ClockIcon,
  IdentificationCardIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/dist/ssr";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
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
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <IdentificationCardIcon className="size-5" weight="duotone" />
            <span className="text-xs font-medium uppercase tracking-wide">
              Identité
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-rdc-navy">
            Identité vérifiée
          </h1>
          <p className="text-sm text-muted-foreground">
            Vos informations ont été validées et ne peuvent plus être
            modifiées.
          </p>
        </div>

        <Card className="ring-1 ring-rdc-navy/5">
          <CardHeader className="border-b border-emerald-100 bg-emerald-50/60 [.border-b]:pb-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                <CheckCircleIcon className="size-5" weight="fill" />
              </span>
              <div>
                <CardTitle className="text-base text-emerald-900">
                  Compte vérifié
                </CardTitle>
                <CardDescription className="text-emerald-700">
                  Validé le{" "}
                  {kyc.verifiedAt
                    ? new Date(kyc.verifiedAt).toLocaleDateString("fr-CD")
                    : "—"}
                </CardDescription>
              </div>
              <Badge
                variant="outline"
                className="ml-auto border-emerald-200 bg-emerald-50 text-emerald-700"
              >
                Vérifié
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 pt-4 sm:grid-cols-2">
            {INFO.map(([label, value]) => (
              <div
                key={label}
                className="rounded-lg border border-border bg-muted/50 px-3 py-2.5"
              >
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {label}
                </p>
                <p className="mt-0.5 text-sm font-semibold">{value}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Pour toute correction, contactez le support ekonzo.
        </p>

        <div className="rounded-xl border border-primary/15 bg-primary/5 p-4 text-center">
          <p className="text-sm text-rdc-navy">
            Prochaine étape : signer la convention de compte-titres pour pouvoir
            souscrire.
          </p>
          <a
            href="/convention"
            className="mt-3 inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Ouvrir la convention
          </a>
        </div>
      </div>
    );
  }

  if (kyc?.status === "SUBMITTED" || kyc?.status === "UNDER_REVIEW") {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <IdentificationCardIcon className="size-5" weight="duotone" />
            <span className="text-xs font-medium uppercase tracking-wide">
              Identité
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-rdc-navy">
            Dossier en cours d&apos;examen
          </h1>
          <p className="text-sm text-muted-foreground">
            Un agent examine votre dossier — réponse sous 24 à 48h.
          </p>
        </div>

        <Card className="ring-1 ring-rdc-navy/5">
          <CardContent className="space-y-3 py-10 text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-100">
              <ClockIcon className="size-8" weight="duotone" />
            </div>
            <h2 className="text-lg font-bold text-rdc-navy">
              Vérification manuelle en cours
            </h2>
            <p className="text-sm text-muted-foreground">
              Votre visage n&apos;a pas pu être vérifié automatiquement. Un
              agent examine votre dossier — réponse sous 24 à 48h.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-primary">
          <IdentificationCardIcon className="size-5" weight="duotone" />
          <span className="text-xs font-medium uppercase tracking-wide">
            Identité
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-rdc-navy">
          Vérification d&apos;identité
        </h1>
        <p className="text-sm text-muted-foreground">
          {kyc?.status === "REJECTED"
            ? "Votre dossier a été rejeté — recommencez la vérification."
            : "Complétez votre vérification pour pouvoir investir."}
        </p>
      </div>
      {kyc?.status === "REJECTED" && kyc.rejectedNote && (
        <Alert variant="destructive">
          <WarningCircleIcon className="size-4" weight="fill" />
          <AlertTitle>Motif du rejet</AlertTitle>
          <AlertDescription>{kyc.rejectedNote}</AlertDescription>
        </Alert>
      )}
      <KycFlow />
    </div>
  );
}
