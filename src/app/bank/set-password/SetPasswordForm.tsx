"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";

const schema = z
  .object({
    password: z.string().min(8, "8 caractères minimum"),
    confirm: z.string().min(8, "Confirmation requise"),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirm"],
  });

type Form = z.infer<typeof schema>;

type InviteInfo = {
  email: string;
  bankName: string;
  shortName: string;
  logoUrl: string | null;
};

export default function BankSetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const form = useForm<Form>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!token) {
      setLoadError("Lien d'invitation invalide.");
      return;
    }
    fetch(`/api/bank/set-password?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Lien invalide");
        setInfo(data);
      })
      .catch((e) =>
        setLoadError(e instanceof Error ? e.message : "Lien invalide"),
      );
  }, [token]);

  async function onSubmit(data: Form) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/bank/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: data.password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Échec");
      setDone(true);
      setTimeout(() => router.push("/bank/login"), 1800);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,oklch(0.98_0.01_220)_0%,oklch(0.97_0.005_264)_100%)] px-6 py-12">
      <div className="w-full max-w-sm space-y-6 rounded-xl border bg-card p-8 shadow-sm ring-1 ring-rdc-navy/5">
        <div className="space-y-3 text-center">
          {info?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={info.logoUrl}
              alt={info.shortName}
              className="mx-auto h-14 w-auto max-w-[160px] object-contain"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/logo.webp" alt="ekonzo" className="mx-auto h-12 w-auto" />
          )}
          <h1 className="text-xl font-semibold text-rdc-navy">
            Activer l&apos;espace banque
          </h1>
          {info && (
            <p className="text-sm text-muted-foreground">
              {info.bankName}
              <br />
              Identifiant : <strong>{info.email}</strong>
            </p>
          )}
        </div>

        {loadError && (
          <Alert variant="destructive" className="text-sm">
            {loadError}
          </Alert>
        )}

        {done && (
          <Alert className="text-sm border-emerald-200 bg-emerald-50 text-emerald-800">
            Mot de passe enregistré. Redirection vers la connexion…
          </Alert>
        )}

        {!loadError && !done && info && (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="text-sm">
                {error}
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">Nouveau mot de passe</Label>
              <Input
                id="password"
                type="password"
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
              <Label htmlFor="confirm">Confirmer</Label>
              <Input
                id="confirm"
                type="password"
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
              {loading ? "Enregistrement…" : "Activer mon compte"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
