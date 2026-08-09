"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CarIcon,
  CheckCircleIcon,
  ClockIcon,
  CreditCardIcon,
  IdentificationCardIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const DOC_TYPES = [
  { value: "CNI" as const, label: "Carte d'identité", icon: IdentificationCardIcon },
  { value: "PASSPORT" as const, label: "Passeport", icon: CreditCardIcon },
  { value: "PERMIS" as const, label: "Permis de conduire", icon: CarIcon },
];

type Step = "document" | "confirm" | "selfie" | "result";

interface KycFields {
  firstName: string;
  lastName: string;
  postName: string;
  dateOfBirth: string;
  docNumber: string;
  address: string;
}

export function KycFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("document");
  const [docType, setDocType] = useState<"CNI" | "PASSPORT" | "PERMIS">("CNI");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [fields, setFields] = useState<KycFields>({
    firstName: "",
    lastName: "",
    postName: "",
    dateOfBirth: "",
    docNumber: "",
    address: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    approved: boolean;
    similarity: number;
    message: string;
  } | null>(null);

  async function onExtractDocument() {
    if (!docFile) {
      setError("Sélectionnez la photo de votre document.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("docFront", docFile);
      const res = await fetch("/api/kyc/extract", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      const ex = json.extracted ?? {};
      setFields({
        firstName: ex.firstName ?? "",
        lastName: ex.lastName ?? "",
        postName: ex.postName ?? "",
        dateOfBirth: ex.dateOfBirth ?? "",
        docNumber: ex.docNumber ?? "",
        address: ex.address ?? "",
      });
      setStep("confirm");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors de la lecture du document.",
      );
    } finally {
      setLoading(false);
    }
  }

  function onConfirmFields() {
    if (!fields.firstName.trim() || !fields.lastName.trim()) {
      setError("Le nom et le prénom sont requis.");
      return;
    }
    setError("");
    setStep("selfie");
  }

  async function onVerifySelfie() {
    if (!selfieFile) {
      setError("Sélectionnez votre photo selfie.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("selfie", selfieFile);
      formData.append("docType", docType);
      formData.append("firstName", fields.firstName);
      formData.append("lastName", fields.lastName);
      formData.append("postName", fields.postName);
      formData.append("dateOfBirth", fields.dateOfBirth);
      formData.append("docNumber", fields.docNumber);
      formData.append("address", fields.address);

      const res = await fetch("/api/kyc/verify-face", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setResult({
        approved: json.approved,
        similarity: json.similarity,
        message: json.message,
      });
      setStep("result");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors de la vérification.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (step === "result" && result) {
    return (
      <Card className="ring-1 ring-rdc-navy/5">
        <CardContent className="space-y-4 py-8 text-center">
          <div
            className={cn(
              "mx-auto flex size-16 items-center justify-center rounded-full ring-1",
              result.approved
                ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                : "bg-amber-50 text-amber-700 ring-amber-100",
            )}
          >
            {result.approved ? (
              <CheckCircleIcon className="size-8" weight="fill" />
            ) : (
              <ClockIcon className="size-8" weight="duotone" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold text-rdc-navy">
              {result.approved
                ? "Identité vérifiée"
                : "Vérification en cours"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {result.message}
            </p>
            {result.approved && (
              <p className="mt-2 text-xs text-emerald-600">
                Correspondance faciale : {result.similarity}%
              </p>
            )}
          </div>
          <Button
            onClick={() => router.push("/dashboard")}
            className="h-11 w-full"
            size="lg"
          >
            Aller au tableau de bord
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-1">
        {(["document", "confirm", "selfie"] as const).map((s, i) => {
          const currentIdx = ["document", "confirm", "selfie"].indexOf(step);
          return (
            <div
              key={s}
              className={cn(
                "h-1 flex-1 rounded-full",
                currentIdx >= i ? "bg-primary" : "bg-muted",
              )}
            />
          );
        })}
      </div>

      {error && (
        <Alert variant="destructive">
          <WarningCircleIcon className="size-4" weight="fill" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {step === "document" && (
        <Card className="ring-1 ring-rdc-navy/5">
          <CardHeader className="border-b [.border-b]:pb-4">
            <CardTitle className="text-base">Type de document</CardTitle>
            <CardDescription>
              Choisissez votre pièce d&apos;identité
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-4">
            <div className="grid grid-cols-3 gap-2">
              {DOC_TYPES.map((d) => {
                const Icon = d.icon;
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setDocType(d.value)}
                    className={cn(
                      "rounded-lg border p-3 text-center transition-colors",
                      docType === d.value
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "hover:bg-muted/50",
                    )}
                  >
                    <Icon
                      className={cn(
                        "mx-auto mb-1 size-6",
                        docType === d.value
                          ? "text-primary"
                          : "text-muted-foreground",
                      )}
                      weight="duotone"
                    />
                    <p className="text-xs font-medium leading-tight">
                      {d.label}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="space-y-2">
              <Label htmlFor="docFile">Photo du document (recto)</Label>
              <Input
                id="docFile"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="h-11 pt-2"
                onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">
                Photo nette, bien éclairée, texte lisible. Max 5 Mo.
              </p>
            </div>

            <Button
              onClick={onExtractDocument}
              className="h-11 w-full"
              size="lg"
              disabled={loading || !docFile}
            >
              {loading ? "Lecture du document…" : "Analyser mon document"}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "confirm" && (
        <Card className="ring-1 ring-rdc-navy/5">
          <CardHeader className="border-b [.border-b]:pb-4">
            <CardTitle className="text-base">Vos informations</CardTitle>
            <CardDescription>
              Vérifiez et corrigez si nécessaire
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <Alert className="border-primary/20 bg-primary/5 text-primary">
              <IdentificationCardIcon className="size-4" weight="duotone" />
              <AlertTitle>Extraction automatique</AlertTitle>
              <AlertDescription className="text-primary/80">
                Ces informations ont été extraites de votre document. Corrigez-les
                si nécessaire.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nom</Label>
                <Input
                  className="h-10"
                  value={fields.lastName}
                  onChange={(e) =>
                    setFields((f) => ({ ...f, lastName: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Post-nom</Label>
                <Input
                  className="h-10"
                  value={fields.postName}
                  onChange={(e) =>
                    setFields((f) => ({ ...f, postName: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Prénom</Label>
              <Input
                className="h-10"
                value={fields.firstName}
                onChange={(e) =>
                  setFields((f) => ({ ...f, firstName: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date de naissance</Label>
                <Input
                  className="h-10"
                  placeholder="jj/mm/aaaa"
                  value={fields.dateOfBirth}
                  onChange={(e) =>
                    setFields((f) => ({ ...f, dateOfBirth: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>N° du document</Label>
                <Input
                  className="h-10 bg-muted/50"
                  value={fields.docNumber}
                  readOnly
                  disabled
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Adresse complète</Label>
              <Input
                className="h-10"
                value={fields.address}
                onChange={(e) =>
                  setFields((f) => ({ ...f, address: e.target.value }))
                }
              />
            </div>

            <Button
              onClick={onConfirmFields}
              className="h-11 w-full"
              size="lg"
              disabled={loading}
            >
              Suivant
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setStep("document")}
            >
              Reprendre la photo du document
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "selfie" && (
        <Card className="ring-1 ring-rdc-navy/5">
          <CardHeader className="border-b [.border-b]:pb-4">
            <CardTitle className="text-base">Photo selfie</CardTitle>
            <CardDescription>
              Nous comparons cette photo avec celle de votre document
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-4">
            <div className="space-y-2">
              <Label htmlFor="selfieFile">Votre photo selfie</Label>
              <Input
                id="selfieFile"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="user"
                className="h-11 pt-2"
                onChange={(e) => setSelfieFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">
                Visage bien visible, sans lunettes de soleil ni masque.
              </p>
            </div>

            <Button
              onClick={onVerifySelfie}
              className="h-11 w-full"
              size="lg"
              disabled={loading || !selfieFile}
            >
              {loading ? "Vérification du visage…" : "Vérifier mon identité"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setStep("confirm")}
            >
              Retour
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
