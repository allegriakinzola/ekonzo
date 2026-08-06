"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";

const DOC_TYPES = [
  { value: "CNI", label: "Carte d'identité", icon: "🪪" },
  { value: "PASSPORT", label: "Passeport", icon: "📕" },
  { value: "PERMIS", label: "Permis de conduire", icon: "🚗" },
] as const;

type Step = "document" | "confirm" | "selfie" | "result";

const STEP_TITLES: Record<Step, string> = {
  document: "Pièce d'identité",
  confirm: "Vos informations",
  selfie: "Photo selfie",
  result: "Résultat",
};

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
    firstName: "", lastName: "", postName: "", dateOfBirth: "", docNumber: "", address: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ approved: boolean; similarity: number; message: string } | null>(null);

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
      setError(err instanceof Error ? err.message : "Erreur lors de la lecture du document.");
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

      const res = await fetch("/api/kyc/verify-face", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setResult({
        approved: json.approved,
        similarity: json.similarity,
        message: json.message,
      });
      setStep("result");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de la vérification.");
    } finally {
      setLoading(false);
    }
  }

  if (step === "result" && result) {
    return (
      <div className="rounded-xl border bg-white p-8 text-center space-y-4">
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl ${
          result.approved ? "bg-emerald-100" : "bg-amber-100"
        }`}>
          {result.approved ? "✅" : "⏳"}
        </div>
        <div>
          <h3 className="text-lg font-bold">
            {result.approved ? "Identité vérifiée !" : "Vérification en cours"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">{result.message}</p>
          {result.approved && (
            <p className="text-xs text-emerald-600 mt-2">Correspondance faciale : {result.similarity}%</p>
          )}
        </div>
        <Button onClick={() => router.push("/dashboard")} className="w-full h-11">
          Aller au tableau de bord
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <div className="flex gap-1">
        {(["document", "confirm", "selfie"] as const).map((s, i) => {
          const currentIdx = ["document", "confirm", "selfie"].indexOf(step);
          return (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full ${currentIdx >= i ? "bg-primary" : "bg-muted"}`}
            />
          );
        })}
      </div>

      {error && (
        <Alert variant="destructive" className="text-sm">{error}</Alert>
      )}

      {/* Étape 1 — Document */}
      {step === "document" && (
        <div className="rounded-xl border bg-white p-6 space-y-5">
          <div>
            <h3 className="font-semibold text-sm">Type de document</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Choisissez votre pièce d'identité</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {DOC_TYPES.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setDocType(d.value)}
                className={`rounded-lg border p-3 text-center transition-colors ${
                  docType === d.value
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "hover:bg-slate-50"
                }`}
              >
                <p className="text-2xl mb-1">{d.icon}</p>
                <p className="text-xs font-medium leading-tight">{d.label}</p>
              </button>
            ))}
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

          <Button onClick={onExtractDocument} className="w-full h-11" disabled={loading || !docFile}>
            {loading ? "Lecture du document…" : "Analyser mon document"}
          </Button>
        </div>
      )}

      {/* Étape 2 — Confirmation */}
      {step === "confirm" && (
        <div className="rounded-xl border bg-white p-6 space-y-4">
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
            Ces informations ont été extraites de votre document. Corrigez-les si nécessaire.
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nom</Label>
              <Input className="h-10" value={fields.lastName}
                onChange={(e) => setFields((f) => ({ ...f, lastName: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Post-nom</Label>
              <Input className="h-10" value={fields.postName}
                onChange={(e) => setFields((f) => ({ ...f, postName: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Prénom</Label>
            <Input className="h-10" value={fields.firstName}
              onChange={(e) => setFields((f) => ({ ...f, firstName: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date de naissance</Label>
              <Input className="h-10" placeholder="jj/mm/aaaa" value={fields.dateOfBirth}
                onChange={(e) => setFields((f) => ({ ...f, dateOfBirth: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>N° du document</Label>
              <Input className="h-10 bg-slate-50" value={fields.docNumber} readOnly disabled />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Adresse complète</Label>
            <Input className="h-10" value={fields.address}
              onChange={(e) => setFields((f) => ({ ...f, address: e.target.value }))} />
          </div>

          <Button onClick={onConfirmFields} className="w-full h-11" disabled={loading}>
            Suivant
          </Button>
          <button type="button" onClick={() => setStep("document")}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground">
            ← Reprendre la photo du document
          </button>
        </div>
      )}

      {/* Étape 3 — Selfie */}
      {step === "selfie" && (
        <div className="rounded-xl border bg-white p-6 space-y-5">
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
              Visage bien visible, sans lunettes de soleil ni masque. Nous comparons
              cette photo avec celle de votre document.
            </p>
          </div>

          <Button onClick={onVerifySelfie} className="w-full h-11" disabled={loading || !selfieFile}>
            {loading ? "Vérification du visage…" : "Vérifier mon identité"}
          </Button>
          <button type="button" onClick={() => setStep("confirm")}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground">
            ← Retour
          </button>
        </div>
      )}
    </div>
  );
}
