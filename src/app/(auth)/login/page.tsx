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

const loginSchema = z.object({
  email: z.string().email("E-mail invalide"),
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
      const result = await authClient.signIn.email({
        email: data.email.trim().toLowerCase(),
        password: data.password,
      });
      if (result.error) throw new Error(result.error.message);

      const session = await authClient.getSession();
      const role = (session.data?.user as { role?: string } | undefined)?.role;
      if (role === "ADMIN" || role === "SUPER_ADMIN") {
        router.push("/admin");
      } else if (role === "BANK") {
        router.push("/bank");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("E-mail ou mot de passe incorrect.");
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
          <p className="text-sm leading-relaxed text-primary-foreground/80">
            Espace investisseur — connexion par e-mail.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/60">
          © {new Date().getFullYear()} ekonzo · Ministère des Finances ·
          Kinshasa, RDC
        </p>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2">
            <div className="lg:hidden">
              <img
                src="/logo.webp"
                alt="Ministère des Finances"
                className="h-10 w-auto"
              />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Connexion investisseur
            </h2>
            <p className="text-sm text-muted-foreground">
              Entrez votre e-mail et votre mot de passe
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="text-sm">
              {error}
            </Alert>
          )}

          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-5"
          >
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                placeholder="vous@exemple.com"
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
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="h-11 pr-12"
                  {...form.register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
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
            <Button type="submit" className="h-11 w-full" disabled={loading}>
              {loading ? "Connexion…" : "Se connecter"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Pas encore de compte ?{" "}
              <a
                href="/register"
                className="font-medium text-primary hover:underline"
              >
                Créer un compte
              </a>
            </p>
            <p className="text-center text-xs text-muted-foreground">
              Banque ?{" "}
              <a href="/bank/login" className="hover:underline">
                Espace banque
              </a>
              {" · "}
              Ministère ?{" "}
              <a href="/ministry/login" className="hover:underline">
                Espace ministère
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
