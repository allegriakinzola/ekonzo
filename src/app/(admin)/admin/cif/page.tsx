import Link from "next/link";
import {
  DownloadSimpleIcon,
  FileTextIcon,
  IdentificationCardIcon,
  SignatureIcon,
} from "@phosphor-icons/react/dist/ssr";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { requireRole } from "@/lib/session";
import { cn } from "@/lib/utils";
import { fetchCifClients } from "@/modules/cif/cif.service";

function kycDocHref(absPath: string | null | undefined, userId: string) {
  if (!absPath) return null;
  const filename = absPath.split(/[\\/]/).pop();
  if (!filename) return null;
  return `/api/kyc/file/${userId}/${filename}`;
}

const KYC_LABELS: Record<string, string> = {
  PENDING: "Non soumis",
  SUBMITTED: "En attente",
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

export default async function AdminCifPage() {
  await requireRole(["ADMIN", "SUPER_ADMIN"]);

  const clients = await fetchCifClients();
  const withKyc = clients.filter((c) => c.kyc).length;
  const withConvention = clients.filter(
    (c) => c.securitiesAgreements.length > 0,
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <IdentificationCardIcon className="size-5" weight="duotone" />
            <span className="text-xs font-medium uppercase tracking-wide">
              Conformité
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-rdc-navy">
            CIF — Fichier client
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Constitution du dossier client : identité, KYC (recto + selfie),
            profil de règlement, comptes MoMo/banque, convention compte-titres
            signée et documents associés. Export Excel pour archivage / banques
            partenaires.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="h-7 px-3 text-xs">
            {clients.length} client{clients.length > 1 ? "s" : ""}
          </Badge>
          <Badge variant="outline" className="h-7 px-3 text-xs">
            {withKyc} KYC
          </Badge>
          <Badge variant="outline" className="h-7 px-3 text-xs">
            {withConvention} convention{withConvention > 1 ? "s" : ""}
          </Badge>
          <a
            href="/api/admin/cif/export"
            className={cn(buttonVariants(), "gap-2")}
          >
            <DownloadSimpleIcon className="size-4" weight="bold" />
            Télécharger CIF Excel (tous)
          </a>
        </div>
      </div>

      <Card className="border-border/80 bg-card shadow-sm ring-1 ring-rdc-navy/5">
        <CardHeader className="border-b [.border-b]:pb-4">
          <CardTitle className="text-base">Dossiers CIF</CardTitle>
          <CardDescription>
            Chaque ligne regroupe les informations et liens documents du client.
            L&apos;Excel contient deux feuilles : CIF Clients + Conventions.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {clients.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-muted-foreground">
              Aucun client inscrit.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="px-4">Client</TableHead>
                  <TableHead className="px-4">KYC</TableHead>
                  <TableHead className="px-4">Convention</TableHead>
                  <TableHead className="px-4">Règlement</TableHead>
                  <TableHead className="px-4">Documents</TableHead>
                  <TableHead className="px-4 text-right">Export</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((u) => {
                  const agreement = u.securitiesAgreements[0] ?? null;
                  const kyc = u.kyc;
                  const frontUrl = kyc
                    ? kycDocHref(kyc.docFrontUrl, u.id)
                    : null;
                  const selfieUrl = kyc
                    ? kycDocHref(kyc.selfieUrl, u.id)
                    : null;

                  return (
                    <TableRow key={u.id}>
                      <TableCell className="px-4 py-3 whitespace-normal">
                        <div>
                          <p className="text-sm font-medium leading-tight">
                            {kyc
                              ? [kyc.firstName, kyc.postName, kyc.lastName]
                                  .filter(Boolean)
                                  .join(" ")
                              : u.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {u.phoneNumber ?? "—"}
                          </p>
                          <p className="text-[11px] text-muted-foreground/80">
                            Inscrit {formatDate(u.createdAt)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={cn(kycBadgeClass(u.kycStatus))}
                        >
                          {KYC_LABELS[u.kycStatus] ?? u.kycStatus}
                        </Badge>
                        {kyc?.docNumber && (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {kyc.docType} · {kyc.docNumber}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 whitespace-normal">
                        {agreement ? (
                          <div className="space-y-0.5">
                            <Badge
                              variant="outline"
                              className="border-emerald-200 bg-emerald-50 text-emerald-700"
                            >
                              Signée
                            </Badge>
                            <p className="text-[11px] text-muted-foreground">
                              v{agreement.convention.version} ·{" "}
                              {agreement.partnerBankName}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {agreement.signedName} ·{" "}
                              {formatDate(agreement.signedAt)}
                            </p>
                          </div>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-border bg-muted text-muted-foreground"
                          >
                            Non signée
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-xs text-muted-foreground whitespace-normal">
                        {u.settlementProfile ? (
                          <div>
                            <p className="font-medium text-foreground">
                              {u.settlementProfile.preferredChannel}
                            </p>
                            <p>
                              {u.settlementProfile.momoPhone ||
                                u.settlementProfile.bankAccountNumber ||
                                "—"}
                            </p>
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {frontUrl && (
                            <a
                              href={frontUrl}
                              target="_blank"
                              rel="noreferrer"
                              className={cn(
                                buttonVariants({ variant: "outline", size: "sm" }),
                                "h-7 gap-1 px-2 text-[11px]",
                              )}
                            >
                              <IdentificationCardIcon className="size-3.5" />
                              Recto
                            </a>
                          )}
                          {selfieUrl && (
                            <a
                              href={selfieUrl}
                              target="_blank"
                              rel="noreferrer"
                              className={cn(
                                buttonVariants({ variant: "outline", size: "sm" }),
                                "h-7 gap-1 px-2 text-[11px]",
                              )}
                            >
                              Selfie
                            </a>
                          )}
                          {agreement && (
                            <a
                              href={`/api/admin/cif/${u.id}/convention`}
                              className={cn(
                                buttonVariants({ variant: "outline", size: "sm" }),
                                "h-7 gap-1 px-2 text-[11px]",
                              )}
                            >
                              <FileTextIcon className="size-3.5" />
                              PDF
                            </a>
                          )}
                          {agreement?.signatureImagePath && (
                            <a
                              href={`/api/admin/cif/${u.id}/signature`}
                              className={cn(
                                buttonVariants({ variant: "outline", size: "sm" }),
                                "h-7 gap-1 px-2 text-[11px]",
                              )}
                            >
                              <SignatureIcon className="size-3.5" />
                              Signature
                            </a>
                          )}
                          {!frontUrl && !agreement && (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <a
                          href={`/api/admin/cif/export?userId=${u.id}`}
                          className={cn(
                            buttonVariants({ size: "sm" }),
                            "gap-1.5",
                          )}
                        >
                          <DownloadSimpleIcon className="size-3.5" />
                          Excel
                        </a>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Les liens documents dans l&apos;Excel nécessitent une session admin
        active. Retour{" "}
        <Link href="/admin/users" className="underline underline-offset-2">
          Utilisateurs
        </Link>
        .
      </p>
    </div>
  );
}
