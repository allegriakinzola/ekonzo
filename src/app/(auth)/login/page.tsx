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

const loginSchema = z.object({
  phoneNumber: z
    .string()
    .transform((v) => normalizeMomoPhone(v))
    .refine(isValidMomoPhone, MOMO_PHONE_ERROR),
  password: z.string().min(1, "Mot de passe requis"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data: LoginForm) {
    setLoading(true);
    setError("");
    try {
      const email = `${data.phoneNumber}@phone.ekonzo.cd`;
      const result = await authClient.signIn.email({ email, password: data.password });
      if (result.error) throw new Error(result.error.message);
      router.push("/convention");
    } catch {
      setError("Numéro ou mot de passe incorrect.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Panneau gauche — branding */}
      <div className="hidden lg:flex flex-col justify-between bg-primary p-12 text-primary-foreground relative overflow-hidden">
        {/* Bandes drapeau RDC en filigrane */}
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
        <div className="space-y-4">
          <p className="text-3xl font-semibold leading-snug">
            Investissez dans les titres du Trésor de la RDC
          </p>
          <p className="text-primary-foreground/80 text-sm leading-relaxed">
            Bons du Trésor, accessibles à tous, dès 10 000 CDF.
            Rendements garantis par l&apos;État congolais.
          </p>
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
            <h2 className="text-2xl font-semibold tracking-tight">Connexion</h2>
            <p className="text-sm text-muted-foreground">
              Entrez votre numéro de téléphone et votre mot de passe
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="text-sm">
              {error}
            </Alert>
          )}

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="phone">Numéro de téléphone</Label>
              <Input
                id="phone"
                placeholder="812345678"
                type="tel"
                inputMode="numeric"
                maxLength={9}
                className="h-11"
                {...form.register("phoneNumber")}
              />
              <p className="text-xs text-muted-foreground">
                9 chiffres, sans 0 ni +243
              </p>
              {form.formState.errors.phoneNumber && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.phoneNumber.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="h-11 pr-12"
                  {...form.register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm"
                >
                  {showPassword ? "Masquer" : "Afficher"}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? "Connexion…" : "Se connecter"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Pas encore de compte ?{" "}
              <a href="/register" className="text-primary font-medium hover:underline">
                Créer un compte
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
