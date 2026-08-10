"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import {
  isValidMomoPhone,
  MOMO_PHONE_ERROR,
  normalizeMomoPhone,
} from "@/modules/payments/phone";

const registerSchema = z.object({
  phoneNumber: z
    .string()
    .transform((v) => normalizeMomoPhone(v))
    .refine(isValidMomoPhone, MOMO_PHONE_ERROR),
});

const otpSchema = z.object({
  code: z.string().length(6, "Le code est à 6 chiffres"),
});

const passwordSchema = z.object({
  password: z.string().min(8, "Au moins 8 caractères"),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirm"],
});

type RegisterForm = z.infer<typeof registerSchema>;
type OtpForm = z.infer<typeof otpSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

const DOC_TYPES = [
  { value: "CNI", label: "Carte d'identité", icon: "🪪" },
  { value: "PASSPORT", label: "Passeport", icon: "📕" },
  { value: "PERMIS", label: "Permis de conduire", icon: "🚗" },
] as const;

const STEPS = ["form", "otp", "document", "confirm", "selfie", "password"] as const;
type Step = (typeof STEPS)[number];

const STEP_TITLES: Record<Step, string> = {
  form: "Créer un compte",
  otp: "Vérification",
  document: "Pièce d'identité",
  confirm: "Vos informations",
  selfie: "Photo selfie",
  password: "Mot de passe",
};

const STEP_SUBTITLES: Record<Step, string> = {
  form: "Rejoignez ekonzo pour investir dans les titres du Trésor",
  otp: "",
  document: "Choisissez et photographiez votre document (recto uniquement)",
  confirm: "Vérifiez les informations extraites de votre document",
  selfie: "Prenez une photo de votre visage pour vérifier votre identité",
  password: "Choisissez un mot de passe pour vos prochaines connexions",
};

interface KycFields {
  firstName: string;
  lastName: string;
  postName: string;
  dateOfBirth: string;
  docNumber: string;
  address: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // État KYC
  const [docType, setDocType] = useState<"CNI" | "PASSPORT" | "PERMIS">("CNI");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [fields, setFields] = useState<KycFields>({
    firstName: "", lastName: "", postName: "", dateOfBirth: "", docNumber: "", address: "",
  });
  const [kycResult, setKycResult] = useState<{ approved: boolean; similarity: number } | null>(null);

  const registerForm = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });
  const otpForm = useForm<OtpForm>({ resolver: zodResolver(otpSchema) });
  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  async function onRegister(data: RegisterForm) {
    setLoading(true);
    setError("");
    try {
      await authClient.phoneNumber.sendOtp({
        phoneNumber: data.phoneNumber,
      });
      setPhone(data.phoneNumber);
      setStep("otp");
    } catch {
      setError("Impossible d'envoyer le code. Vérifiez le numéro.");
    } finally {
      setLoading(false);
    }
  }

  async function onVerifyOtp(data: OtpForm) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/phone-number/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phoneNumber: phone, code: data.code }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Code incorrect ou expiré.");
      setStep("document");
    } catch {
      setError("Code incorrect ou expiré.");
    } finally {
      setLoading(false);
    }
  }

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

      setKycResult({ approved: json.approved, similarity: json.similarity });
      setStep("password");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de la vérification.");
    } finally {
      setLoading(false);
    }
  }

  async function onSetPassword(data: PasswordForm) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: data.password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      router.push("/convention");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création du mot de passe.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Panneau gauche — branding */}
      <div className="hidden lg:flex flex-col justify-between bg-primary p-12 text-primary-foreground relative overflow-hidden">
        {/* Bandes drapeau RDC */}
        <div className="absolute bottom-0 left-0 right-0 flex h-1.5">
          <div className="flex-1 bg-rdc-navy" />
          <div className="w-8 bg-yellow-400" />
          <div className="flex-1 bg-rdc-red" />
        </div>
        <div className="bg-white rounded-xl p-4 w-fit">
          <img
            src="/logo.webp"
            alt="Ministère des Finances — RDC"
            className="h-14 w-auto"
          />
        </div>
        <div className="space-y-6">
          <p className="text-3xl font-semibold leading-snug">
            Votre argent travaille pour vous
          </p>
          <ul className="space-y-3 text-sm text-primary-foreground/80">
            <li className="flex items-center gap-2">
              <span className="text-white font-bold">✓</span> Bons du Trésor dès 10 000 CDF
            </li>
            <li className="flex items-center gap-2">
              <span className="text-white font-bold">✓</span> Rendements garantis par l’État
            </li>
            <li className="flex items-center gap-2">
              <span className="text-white font-bold">✓</span> Paiement via Mobile Money
            </li>
          </ul>
        </div>
        <p className="text-xs text-primary-foreground/60">
          © {new Date().getFullYear()} ekonzo · Ministère des Finances · Kinshasa, RDC
        </p>
      </div>

      {/* Panneau droit — formulaire */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2">
            <div className="lg:hidden">
              <img src="/logo.webp" alt="Ministère des Finances" className="h-10 w-auto" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {STEP_TITLES[step]}
            </h2>
            <p className="text-sm text-muted-foreground">
              {step === "otp" ? `Code envoyé au ${phone}` : STEP_SUBTITLES[step]}
            </p>
          </div>

          {/* Indicateur d'étapes */}
          <div className="flex gap-1">
            {STEPS.map((s, i) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full ${
                  STEPS.indexOf(step) >= i ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>

          {error && (
            <Alert variant="destructive" className="text-sm">
              {error}
            </Alert>
          )}

          {step === "form" && (
            <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="phone">Numéro de téléphone</Label>
                <Input
                  id="phone"
                  placeholder="812345678"
                  type="tel"
                  inputMode="numeric"
                  maxLength={9}
                  className="h-11"
                  {...registerForm.register("phoneNumber")}
                />
                <p className="text-xs text-muted-foreground">
                  9 chiffres, sans 0 ni +243 — ce numéro servira aussi pour Mobile Money.
                </p>
                {registerForm.formState.errors.phoneNumber && (
                  <p className="text-xs text-destructive">{registerForm.formState.errors.phoneNumber.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? "Envoi du code…" : "Recevoir le code de vérification"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Déjà un compte ?{" "}
                <a href="/login" className="text-primary font-medium hover:underline">Se connecter</a>
              </p>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={otpForm.handleSubmit(onVerifyOtp)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="code">Code à 6 chiffres</Label>
                <Input
                  id="code"
                  placeholder="123 456"
                  maxLength={6}
                  inputMode="numeric"
                  className="h-11 text-center text-lg tracking-widest"
                  {...otpForm.register("code")}
                />
                {otpForm.formState.errors.code && (
                  <p className="text-xs text-destructive">{otpForm.formState.errors.code.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? "Vérification…" : "Confirmer le numéro"}
              </Button>
              <button type="button" onClick={() => setStep("form")}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground">
                ← Corriger le numéro
              </button>
            </form>
          )}

          {step === "document" && (
            <div className="space-y-5">
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

          {step === "confirm" && (
            <div className="space-y-4">
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
                Informations lues automatiquement sur votre document. Vérifiez et corrigez si besoin avant de continuer.
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
                  <Input
                    className="h-10"
                    value={fields.docNumber}
                    onChange={(e) => setFields((f) => ({ ...f, docNumber: e.target.value }))}
                  />
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

          {step === "selfie" && (
            <div className="space-y-5">
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

          {step === "password" && kycResult && (
            <div className={`rounded-lg border p-3 text-sm ${
              kycResult.approved
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-amber-50 border-amber-200 text-amber-800"
            }`}>
              {kycResult.approved
                ? `✅ Identité vérifiée (correspondance ${kycResult.similarity}%)`
                : "⏳ Vérification manuelle en cours — vous pouvez terminer votre inscription, un agent examinera votre dossier sous 24–48h."}
            </div>
          )}

          {step === "password" && (
            <form onSubmit={passwordForm.handleSubmit(onSetPassword)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="h-11 pr-20"
                    {...passwordForm.register("password")}
                  />
                  <button type="button" onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    {showPassword ? "Masquer" : "Afficher"}
                  </button>
                </div>
                {passwordForm.formState.errors.password && (
                  <p className="text-xs text-destructive">{passwordForm.formState.errors.password.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirmer le mot de passe</Label>
                <Input
                  id="confirm"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="h-11"
                  {...passwordForm.register("confirm")}
                />
                {passwordForm.formState.errors.confirm && (
                  <p className="text-xs text-destructive">{passwordForm.formState.errors.confirm.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? "Création…" : "Terminer mon inscription"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
