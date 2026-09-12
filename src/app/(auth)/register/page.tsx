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

const registerSchema = z
  .object({
    nom: z.string().min(1, "Nom requis"),
    postnom: z.string().optional(),
    prenom: z.string().min(1, "Prénom requis"),
    email: z.string().email("E-mail invalide"),
    password: z.string().min(8, "Au moins 8 caractères"),
    confirm: z.string().min(1, "Confirmation requise"),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirm"],
  });

const otpSchema = z.object({
  otp: z.string().length(6, "Code à 6 chiffres"),
});

type RegisterForm = z.infer<typeof registerSchema>;
type OtpForm = z.infer<typeof otpSchema>;
type Step = "form" | "otp";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<{
    email: string;
    password: string;
  } | null>(null);

  const form = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });
  const otpForm = useForm<OtpForm>({ resolver: zodResolver(otpSchema) });

  async function onRegister(data: RegisterForm) {
    setLoading(true);
    setError("");
    const email = data.email.trim().toLowerCase();
    try {
      const res = await fetch("/api/register?action=start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: data.nom.trim(),
          postnom: (data.postnom ?? "").trim(),
          prenom: data.prenom.trim(),
          email,
          password: data.password,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Impossible de démarrer l'inscription.");
      }

      setPending({ email, password: data.password });
      setStep("otp");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Impossible de créer le compte.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function onVerifyOtp(data: OtpForm) {
    if (!pending) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/register?action=confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: pending.email,
          otp: data.otp,
          password: pending.password,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Code invalide ou expiré.");

      const signedIn = await authClient.signIn.email({
        email: pending.email,
        password: pending.password,
      });
      if (signedIn.error) throw new Error(signedIn.error.message);

      router.push("/profile/bank");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Code invalide ou expiré.");
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    if (!pending) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/register?action=resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pending.email }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Impossible de renvoyer le code.");
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Impossible de renvoyer le code.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-primary-foreground lg:flex">
        <div className="absolute bottom-0 left-0 right-0 flex h-1.5">
          <div className="flex-1 bg-rdc-navy" />
          <div className="w-8 bg-yellow-400" />
          <div className="flex-1 bg-rdc-red" />
        </div>
        <div className="w-fit rounded-xl bg-white p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.webp"
            alt="Ministère des Finances — RDC"
            className="h-14 w-auto"
          />
        </div>
        <div className="space-y-4">
          <p className="text-3xl font-semibold leading-snug">
            Créez votre compte investisseur
          </p>
          <p className="text-sm leading-relaxed text-primary-foreground/80">
            Votre compte n&apos;est créé qu&apos;après vérification du code reçu
            par e-mail.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/60">
          © {new Date().getFullYear()} ekonzo · Ministère des Finances
        </p>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              {step === "form" ? "Inscription" : "Vérifiez votre e-mail"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {step === "form"
                ? "Remplissez vos informations pour recevoir un code de confirmation"
                : `Un code à 6 chiffres a été envoyé à ${pending?.email}. Aucun compte n'existe tant que ce code n'est pas validé.`}
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="text-sm">
              {error}
            </Alert>
          )}

          {step === "form" ? (
            <form
              onSubmit={form.handleSubmit(onRegister)}
              className="space-y-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom</Label>
                  <Input id="nom" className="h-11" {...form.register("nom")} />
                  {form.formState.errors.nom && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.nom.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postnom">Postnom</Label>
                  <Input
                    id="postnom"
                    className="h-11"
                    {...form.register("postnom")}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="prenom">Prénom</Label>
                  <Input
                    id="prenom"
                    className="h-11"
                    {...form.register("prenom")}
                  />
                  {form.formState.errors.prenom && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.prenom.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className="h-11"
                  {...form.register("email")}
                />
                {form.formState.errors.email && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  className="h-11"
                  {...form.register("password")}
                />
                {form.formState.errors.password && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirmer le mot de passe</Label>
                <Input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  className="h-11"
                  {...form.register("confirm")}
                />
                {form.formState.errors.confirm && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.confirm.message}
                  </p>
                )}
              </div>
              <Button type="submit" className="h-11 w-full" disabled={loading}>
                {loading ? "Envoi du code…" : "Continuer"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Déjà un compte ?{" "}
                <a
                  href="/login"
                  className="font-medium text-primary hover:underline"
                >
                  Se connecter
                </a>
              </p>
            </form>
          ) : (
            <form
              onSubmit={otpForm.handleSubmit(onVerifyOtp)}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="otp">Code OTP</Label>
                <Input
                  id="otp"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  className="h-11 tracking-[0.3em]"
                  {...otpForm.register("otp")}
                />
                {otpForm.formState.errors.otp && (
                  <p className="text-xs text-destructive">
                    {otpForm.formState.errors.otp.message}
                  </p>
                )}
              </div>
              <Button type="submit" className="h-11 w-full" disabled={loading}>
                {loading ? "Création du compte…" : "Confirmer et créer mon compte"}
              </Button>
              <button
                type="button"
                onClick={resendOtp}
                disabled={loading}
                className="w-full text-center text-sm text-primary hover:underline"
              >
                Renvoyer le code
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
