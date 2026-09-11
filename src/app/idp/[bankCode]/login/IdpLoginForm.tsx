"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { isUsableLogoUrl } from "@/lib/logo";

const schema = z.object({
  email: z.string().email("E-mail invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

type Form = z.infer<typeof schema>;

export function IdpLoginForm({
  bankCode,
  bankName,
  shortName,
  logoUrl,
}: {
  bankCode: string;
  bankName: string;
  shortName: string;
  logoUrl: string | null;
}) {
  const searchParams = useSearchParams();
  const state = searchParams.get("state") ?? "";
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const form = useForm<Form>({ resolver: zodResolver(schema) });

  async function onSubmit(data: Form) {
    setLoading(true);
    setError("");
    try {
      if (!state) throw new Error("Session OAuth invalide");
      const res = await fetch(`/api/idp/${bankCode}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state,
          email: data.email.trim().toLowerCase(),
          password: data.password,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Connexion impossible");
      window.location.href = json.redirectUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,oklch(0.97_0.02_250)_0%,oklch(0.98_0.01_220)_100%)] px-6 py-12">
      <div className="w-full max-w-sm space-y-6 rounded-xl border bg-card p-8 shadow-sm">
        <div className="space-y-3 text-center">
          {isUsableLogoUrl(logoUrl) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={shortName}
              className="mx-auto h-14 w-auto max-w-[160px] object-contain"
            />
          ) : (
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-rdc-navy text-lg font-bold text-white">
              {shortName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <h1 className="text-xl font-semibold text-rdc-navy">
            Connexion {shortName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {bankName}
            <br />
            Autorisez ekonzo à accéder à vos informations de compte.
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="text-sm">
            {error}
          </Alert>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail bancaire</Label>
            <Input
              id="email"
              type="email"
              className="h-11"
              autoComplete="username"
              {...form.register("email")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              className="h-11"
              autoComplete="current-password"
              {...form.register("password")}
            />
          </div>
          <Button type="submit" className="h-11 w-full" disabled={loading || !state}>
            {loading ? "Connexion…" : "Se connecter"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Vous serez redirigé vers ekonzo après authentification.
        </p>
      </div>
    </div>
  );
}
