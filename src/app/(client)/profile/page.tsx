import {
  IdentificationCardIcon,
  LockIcon,
  UserCircleIcon,
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
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { getSettlementProfile } from "@/modules/settlement/settlement.service";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const KYC_LABELS: Record<string, string> = {
  PENDING: "Non soumis",
  SUBMITTED: "En cours de vérif.",
  UNDER_REVIEW: "En révision",
  VERIFIED: "Vérifié",
  APPROVED: "Approuvé",
  REJECTED: "Rejeté",
};

function kycBadgeClass(status: string) {
  switch (status) {
    case "VERIFIED":
    case "APPROVED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "REJECTED":
      return "border-destructive/20 bg-destructive/10 text-destructive";
    case "SUBMITTED":
    case "UNDER_REVIEW":
      return "border-amber-200 bg-amber-50 text-amber-800";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

const DOC_LABELS: Record<string, string> = {
  CNI: "Carte Nationale d'Identité",
  PASSPORT: "Passeport",
  PERMIS: "Permis de conduire",
};

export default async function ProfilePage() {
  const session = await requireRole("CLIENT");

  const [user, settlement] = await Promise.all([
    prisma.user.findUnique({
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
            firstName: true,
            lastName: true,
            postName: true,
            docType: true,
            status: true,
            submittedAt: true,
            verifiedAt: true,
          },
        },
        wallets: { select: { currency: true, balance: true } },
        _count: { select: { subscriptions: true } },
      },
    }),
    getSettlementProfile(session.user.id),
  ]);

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-primary">
          <UserCircleIcon className="size-5" weight="duotone" />
          <span className="text-xs font-medium uppercase tracking-wide">
            Compte
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-rdc-navy">
          Mon profil
        </h1>
        <p className="text-sm text-muted-foreground">
          Informations de votre compte ekonzo
        </p>
      </div>

      <Card className="ring-1 ring-rdc-navy/5">
        <CardHeader className="border-b [.border-b]:pb-4">
          <div className="flex items-center gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
              {user.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </div>
            <div className="space-y-1">
              <CardTitle className="text-lg">{user.name}</CardTitle>
              <Badge
                variant="outline"
                className={cn(kycBadgeClass(user.kycStatus))}
              >
                {KYC_LABELS[user.kycStatus] ?? user.kycStatus}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 pt-4 sm:grid-cols-2">
          <Field label="Numéro de téléphone" value={user.phoneNumber ?? "—"} />
          <Field label="Email" value={user.email ?? "—"} />
          <Field label="Membre depuis" value={formatDate(user.createdAt)} />
          <Field
            label="Souscriptions"
            value={`${user._count.subscriptions} au total`}
          />
        </CardContent>
      </Card>

      {user.kyc && (
        <Card className="ring-1 ring-rdc-navy/5">
          <CardHeader className="border-b [.border-b]:pb-4">
            <div className="flex items-center gap-2">
              <IdentificationCardIcon
                className="size-5 text-primary"
                weight="duotone"
              />
              <div>
                <CardTitle className="text-base">
                  Vérification d&apos;identité (KYC)
                </CardTitle>
                <CardDescription>
                  Informations issues de votre dossier
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 pt-4 sm:grid-cols-2">
            <Field label="Prénom" value={user.kyc.firstName} />
            <Field label="Nom" value={user.kyc.lastName} />
            {user.kyc.postName && (
              <Field label="Post-nom" value={user.kyc.postName} />
            )}
            <Field
              label="Type de document"
              value={DOC_LABELS[user.kyc.docType] ?? user.kyc.docType}
            />
            <Field label="Soumis le" value={formatDate(user.kyc.submittedAt)} />
            {user.kyc.verifiedAt && (
              <Field label="Vérifié le" value={formatDate(user.kyc.verifiedAt)} />
            )}
            <div className="space-y-1.5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Statut
              </p>
              <Badge
                variant="outline"
                className={cn(kycBadgeClass(user.kyc.status))}
              >
                {KYC_LABELS[user.kyc.status] ?? user.kyc.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="ring-1 ring-rdc-navy/5">
        <CardHeader className="border-b [.border-b]:pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Profil de règlement</CardTitle>
              <CardDescription>
                Canal préféré pour payer vos souscriptions
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className={cn(
                settlement.isComplete
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-amber-50 text-amber-800",
              )}
            >
              {settlement.isComplete ? "Configuré" : "À compléter"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label="Canal préféré"
              value={
                settlement.preferredChannel === "MOBILE_MONEY"
                  ? "Mobile Money"
                  : "Virement bancaire"
              }
            />
            <Field
              label="Mobile Money"
              value={settlement.momoPhone ?? "—"}
            />
            <Field label="Banque" value={settlement.bankName ?? "—"} />
            <Field
              label="N° de compte"
              value={settlement.bankAccountNumber ?? "—"}
            />
          </div>
          <Button render={<Link href="/settlement" />} size="sm">
            {settlement.isComplete ? "Modifier" : "Configurer"}
          </Button>
        </CardContent>
      </Card>

      <Alert>
        <LockIcon className="size-4" />
        <AlertTitle>Sécurité</AlertTitle>
        <AlertDescription>
          Pour modifier vos informations personnelles ou votre mot de passe,
          contactez le support ekonzo.
        </AlertDescription>
      </Alert>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/50 px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  );
}
