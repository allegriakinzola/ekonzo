import {
  BankIcon,
  DownloadSimpleIcon,
  FileTextIcon,
  IdentificationCardIcon,
  SignatureIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react/dist/ssr";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
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

function displayName(u: {
  name: string;
  kyc: { firstName: string; lastName: string; postName: string | null } | null;
}) {
  if (!u.kyc) return u.name;
  return [u.kyc.firstName, u.kyc.postName, u.kyc.lastName]
    .filter(Boolean)
    .join(" ");
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function shortBank(name: string) {
  if (name.includes("Equity")) return "Equity BCDC";
  if (name.toLowerCase().includes("à désigner") || name.toLowerCase().includes("partenaire")) {
    return "Banque à désigner";
  }
  return name.length > 28 ? `${name.slice(0, 26)}…` : name;
}

function settlementLabel(channel: string | undefined) {
  if (!channel) return null;
  if (channel === "MOBILE_MONEY") return "Mobile Money";
  if (channel === "BANK_TRANSFER") return "Virement";
  return channel;
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
  const verified = clients.filter((c) => c.kycStatus === "VERIFIED").length;

  const STATS = [
    {
      label: "Clients",
      value: clients.length,
      icon: UsersThreeIcon,
      accent: "text-primary bg-primary/10 ring-primary/15",
    },
    {
      label: "Dossiers KYC",
      value: withKyc,
      icon: IdentificationCardIcon,
      accent: "text-rdc-navy bg-rdc-navy/10 ring-rdc-navy/15",
    },
    {
      label: "KYC vérifiés",
      value: verified,
      icon: IdentificationCardIcon,
      accent: "text-emerald-700 bg-emerald-50 ring-emerald-100",
    },
    {
      label: "Conventions",
      value: withConvention,
      icon: FileTextIcon,
      accent: "text-amber-800 bg-amber-50 ring-amber-100",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
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
          <p className="max-w-xl text-sm text-muted-foreground">
            Dossiers clients complets : identité, KYC, règlement et convention
            compte-titres.
          </p>
        </div>

        <a
          href="/api/admin/cif/export"
          className={cn(buttonVariants({ size: "lg" }), "gap-2 shrink-0")}
        >
          <DownloadSimpleIcon className="size-4" weight="bold" />
          Exporter Excel (tous)
        </a>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {STATS.map((s) => (
          <Card
            key={s.label}
            className="border-border/80 shadow-sm ring-1 ring-rdc-navy/5"
          >
            <CardContent className="flex items-center gap-3 p-4">
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl ring-1",
                  s.accent,
                )}
              >
                <s.icon className="size-5" weight="duotone" />
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight text-rdc-navy">
                  {s.value}
                </p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden border-border/80 shadow-sm ring-1 ring-rdc-navy/5">
        <CardHeader className="border-b bg-muted/30 [.border-b]:pb-4">
          <CardTitle className="text-base text-rdc-navy">
            Dossiers CIF
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {clients.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-muted-foreground">
              Aucun client inscrit.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="px-4 min-w-[200px]">Client</TableHead>
                    <TableHead className="px-4">KYC</TableHead>
                    <TableHead className="px-4 min-w-[160px]">
                      Convention
                    </TableHead>
                    <TableHead className="px-4">Règlement</TableHead>
                    <TableHead className="px-4">Documents</TableHead>
                    <TableHead className="px-4 text-right">Export</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((u) => {
                    const agreement = u.securitiesAgreements[0] ?? null;
                    const kyc = u.kyc;
                    const name = displayName(u);
                    const frontUrl = kyc
                      ? kycDocHref(kyc.docFrontUrl, u.id)
                      : null;
                    const selfieUrl = kyc
                      ? kycDocHref(kyc.selfieUrl, u.id)
                      : null;
                    const hasSignature =
                      Boolean(agreement?.signatureImagePath) ||
                      Boolean(agreement?.signatureImageBase64);
                    const settlement = settlementLabel(
                      u.settlementProfile?.preferredChannel,
                    );

                    return (
                      <TableRow key={u.id} className="align-top">
                        <TableCell className="px-4 py-4 whitespace-normal">
                          <div className="flex items-start gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-rdc-navy/10 text-xs font-bold text-rdc-navy">
                              {initials(name)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold leading-snug text-rdc-navy">
                                {name}
                              </p>
                              <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                                {u.phoneNumber ?? "—"}
                              </p>
                              <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                                {formatDate(u.createdAt)}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="px-4 py-4">
                          <Badge
                            variant="outline"
                            className={cn(kycBadgeClass(u.kycStatus))}
                          >
                            {KYC_LABELS[u.kycStatus] ?? u.kycStatus}
                          </Badge>
                          {kyc?.docNumber && (
                            <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">
                              {kyc.docType} · {kyc.docNumber}
                            </p>
                          )}
                        </TableCell>

                        <TableCell className="px-4 py-4 whitespace-normal">
                          {agreement ? (
                            <div className="space-y-1">
                              <Badge
                                variant="outline"
                                className="border-emerald-200 bg-emerald-50 text-emerald-700"
                              >
                                Signée
                              </Badge>
                              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <BankIcon className="size-3 shrink-0" />
                                {shortBank(agreement.partnerBankName)}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                v{agreement.convention.version} ·{" "}
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

                        <TableCell className="px-4 py-4 text-xs whitespace-normal">
                          {settlement ? (
                            <div>
                              <p className="font-medium text-foreground">
                                {settlement}
                              </p>
                              <p className="mt-0.5 font-mono text-muted-foreground">
                                {u.settlementProfile?.momoPhone ||
                                  u.settlementProfile?.bankAccountNumber ||
                                  "—"}
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        <TableCell className="px-4 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {frontUrl && (
                              <a
                                href={frontUrl}
                                target="_blank"
                                rel="noreferrer"
                                className={cn(
                                  buttonVariants({
                                    variant: "outline",
                                    size: "sm",
                                  }),
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
                                  buttonVariants({
                                    variant: "outline",
                                    size: "sm",
                                  }),
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
                                  buttonVariants({
                                    variant: "outline",
                                    size: "sm",
                                  }),
                                  "h-7 gap-1 px-2 text-[11px]",
                                )}
                              >
                                <FileTextIcon className="size-3.5" />
                                PDF
                              </a>
                            )}
                            {hasSignature && (
                              <a
                                href={`/api/admin/cif/${u.id}/signature`}
                                className={cn(
                                  buttonVariants({
                                    variant: "outline",
                                    size: "sm",
                                  }),
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

                        <TableCell className="px-4 py-4 text-right">
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
