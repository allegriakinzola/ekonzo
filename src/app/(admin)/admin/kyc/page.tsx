"use client";

import { useEffect, useState } from "react";
import {
  CheckCircleIcon,
  IdentificationCardIcon,
  MagnifyingGlassIcon,
  XCircleIcon,
} from "@phosphor-icons/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface KycRecord {
  id: string;
  status: string;
  docType: string;
  firstName: string;
  lastName: string;
  postName: string | null;
  dateOfBirth: string | null;
  docNumber: string | null;
  address: string | null;
  docFrontUrl: string | null;
  selfieUrl: string | null;
  rejectedNote: string | null;
  submittedAt: string;
  verifiedAt: string | null;
  user: {
    id: string;
    name: string;
    phoneNumber: string;
  };
}

const STATUS_LABELS: Record<string, string> = {
  ALL: "Tous",
  SUBMITTED: "À examiner",
  VERIFIED: "Vérifié",
  REJECTED: "Rejeté",
  PENDING: "En attente",
  UNDER_REVIEW: "En révision",
};

const DOC_LABELS: Record<string, string> = {
  CNI: "Carte Nationale d'Identité",
  PASSPORT: "Passeport",
  PERMIS: "Permis de conduire",
};

const FILTER_TABS = [
  { key: "ALL", label: "Tous" },
  { key: "SUBMITTED", label: "À examiner" },
  { key: "VERIFIED", label: "Vérifié" },
  { key: "REJECTED", label: "Rejeté" },
] as const;

function statusBadgeClass(status: string) {
  switch (status) {
    case "VERIFIED":
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

function fileUrl(absPath: string | null | undefined, userId: string) {
  if (!absPath) return null;
  const filename = absPath.split(/[\\/]/).pop();
  if (!filename) return null;
  return `/api/kyc/file/${userId}/${filename}`;
}

export default function AdminKycPage() {
  const [kycs, setKycs] = useState<KycRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [selectedKyc, setSelectedKyc] = useState<KycRecord | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [acting, setActing] = useState(false);

  async function load(status = filter) {
    setLoading(true);
    setFilter(status);
    const res = await fetch(`/api/admin/kyc?status=${status}`);
    const data = await res.json();
    setKycs(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    load("ALL");
  }, []);

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
    load(filter);
  }

  const toReviewCount = kycs.filter((k) => k.status === "SUBMITTED").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <IdentificationCardIcon className="size-5" weight="duotone" />
            <span className="text-xs font-medium uppercase tracking-wide">
              Identité
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-rdc-navy">
            Vérifications KYC
          </h1>
          <p className="text-sm text-muted-foreground">
            Dossiers d&apos;identité envoyés par les utilisateurs
          </p>
        </div>
        {!loading && (
          <Badge variant="outline" className="h-7 px-3 text-xs">
            {kycs.length} dossier{kycs.length > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {filter === "ALL" && toReviewCount > 0 && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900">
          <MagnifyingGlassIcon className="size-4 text-amber-700" />
          <AlertTitle className="text-amber-900">
            {toReviewCount} dossier{toReviewCount > 1 ? "s" : ""} à examiner
          </AlertTitle>
          <AlertDescription className="text-amber-800">
            Ces dossiers n&apos;ont pas passé la vérification faciale automatique.
          </AlertDescription>
        </Alert>
      )}

      <Card className="border-border/80 bg-card shadow-sm ring-1 ring-rdc-navy/5">
        <CardHeader className="border-b [.border-b]:pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Dossiers</CardTitle>
              <CardDescription>
                Filtrez par statut, puis ouvrez un dossier pour l&apos;examiner
              </CardDescription>
            </div>
            <Tabs
              value={filter}
              onValueChange={(value) => {
                if (typeof value === "string") load(value);
              }}
            >
              <TabsList variant="default" className="h-9 w-full sm:w-auto">
                {FILTER_TABS.map((tab) => (
                  <TabsTrigger
                    key={tab.key}
                    value={tab.key}
                    className="px-3 data-active:bg-primary data-active:text-primary-foreground"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
              Chargement…
            </div>
          ) : kycs.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <CheckCircleIcon
                className="size-10 text-primary/50"
                weight="duotone"
              />
              <p className="text-sm font-medium">Aucun dossier dans ce filtre</p>
              <p className="text-xs text-muted-foreground">
                Les nouveaux envois apparaîtront ici automatiquement.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="px-4">Utilisateur</TableHead>
                  <TableHead className="px-4">Document</TableHead>
                  <TableHead className="px-4">Soumis le</TableHead>
                  <TableHead className="px-4">Statut</TableHead>
                  <TableHead className="px-4 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kycs.map((kyc) => (
                  <TableRow key={kyc.id}>
                    <TableCell className="px-4 py-3 whitespace-normal">
                      <p className="text-sm font-medium text-foreground">
                        {kyc.user.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {kyc.user.phoneNumber}
                      </p>
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-normal">
                      <p className="text-xs font-medium">
                        {DOC_LABELS[kyc.docType] ?? kyc.docType}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {kyc.firstName} {kyc.lastName}
                        {kyc.postName ? ` ${kyc.postName}` : ""}
                      </p>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-muted-foreground">
                      {new Date(kyc.submittedAt).toLocaleDateString("fr-CD")}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          "",
                          statusBadgeClass(kyc.status),
                        )}
                      >
                        {STATUS_LABELS[kyc.status] ?? kyc.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedKyc(kyc)}
                      >
                        Examiner
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!selectedKyc}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedKyc(null);
            setRejectReason("");
          }
        }}
      >
        <DialogContent
          className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
          showCloseButton
        >
          {selectedKyc && (
            <>
              <DialogHeader className="border-b border-border pb-4 pr-8">
                <DialogTitle className="text-base text-rdc-navy">
                  {selectedKyc.user.name}
                </DialogTitle>
                <DialogDescription>
                  {selectedKyc.user.phoneNumber} ·{" "}
                  {DOC_LABELS[selectedKyc.docType] ?? selectedKyc.docType}
                </DialogDescription>
                <Badge
                  variant="outline"
                  className={cn(
                    "mt-2 w-fit ",
                    statusBadgeClass(selectedKyc.status),
                  )}
                >
                  {STATUS_LABELS[selectedKyc.status] ?? selectedKyc.status}
                </Badge>
              </DialogHeader>

              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      [
                        "Type de document",
                        DOC_LABELS[selectedKyc.docType] ?? selectedKyc.docType,
                      ],
                      ["N° document", selectedKyc.docNumber ?? "—"],
                      ["Prénom", selectedKyc.firstName || "—"],
                      ["Nom", selectedKyc.lastName || "—"],
                      ["Post-nom", selectedKyc.postName ?? "—"],
                      ["Date de naissance", selectedKyc.dateOfBirth ?? "—"],
                      ["Adresse", selectedKyc.address ?? "—"],
                      ["Téléphone", selectedKyc.user.phoneNumber || "—"],
                      [
                        "Soumis le",
                        new Date(selectedKyc.submittedAt).toLocaleDateString(
                          "fr-CD",
                        ),
                      ],
                      ...(selectedKyc.verifiedAt
                        ? [
                            [
                              "Vérifié le",
                              new Date(
                                selectedKyc.verifiedAt,
                              ).toLocaleDateString("fr-CD"),
                            ] as const,
                          ]
                        : []),
                    ] as const
                  ).map(([label, value]) => (
                    <div
                      key={label}
                      className={cn(
                        "rounded-lg border border-border bg-muted/50 px-3 py-2.5",
                        label === "Adresse" && "col-span-2",
                      )}
                    >
                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {label}
                      </p>
                      <p className="mt-0.5 break-words text-sm font-semibold">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {[
                    {
                      label: "Recto du document",
                      url: fileUrl(
                        selectedKyc.docFrontUrl,
                        selectedKyc.user.id,
                      ),
                    },
                    {
                      label: "Selfie",
                      url: fileUrl(selectedKyc.selfieUrl, selectedKyc.user.id),
                    },
                  ].map(({ label, url }) => (
                    <div key={label} className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground">
                        {label}
                      </p>
                      {url ? (
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt={label}
                            className="h-44 w-full rounded-lg border border-border object-cover transition-opacity hover:opacity-90"
                          />
                        </a>
                      ) : (
                        <div className="flex h-44 w-full items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 text-xs text-muted-foreground">
                          Fichier manquant
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {selectedKyc.rejectedNote && (
                  <Alert variant="destructive">
                    <XCircleIcon className="size-4" />
                    <AlertTitle>Motif de rejet</AlertTitle>
                    <AlertDescription>
                      {selectedKyc.rejectedNote}
                    </AlertDescription>
                  </Alert>
                )}

                {selectedKyc.status === "SUBMITTED" && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="reject-reason">
                          Motif de rejet (obligatoire si refus)
                        </Label>
                        <Input
                          id="reject-reason"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Ex : Document flou, photo illisible, nom incohérent…"
                          className="h-10"
                        />
                      </div>
                      <DialogFooter className="gap-2 sm:justify-stretch">
                        <Button
                          className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
                          disabled={acting}
                          onClick={() =>
                            handleAction(selectedKyc.id, "approve")
                          }
                        >
                          <CheckCircleIcon weight="bold" />
                          {acting ? "…" : "Approuver"}
                        </Button>
                        <Button
                          variant="destructive"
                          className="flex-1"
                          disabled={acting}
                          onClick={() => handleAction(selectedKyc.id, "reject")}
                        >
                          <XCircleIcon weight="bold" />
                          {acting ? "…" : "Rejeter"}
                        </Button>
                      </DialogFooter>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
