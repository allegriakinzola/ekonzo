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

const schema = z.object({
  email: z.string().email("E-mail invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

type Form = z.infer<typeof schema>;

export default function MinistryLoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const form = useForm<Form>({ resolver: zodResolver(schema) });

  async function onSubmit(data: Form) {
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
      if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
        await authClient.signOut();
        throw new Error(
          "Cet espace est réservé au Ministère des Finances.",
        );
      }
      router.push("/admin");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "E-mail ou mot de passe incorrect.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,oklch(0.98_0.01_220)_0%,oklch(0.97_0.005_264)_100%)] px-6 py-12">
      <div className="w-full max-w-sm space-y-8 rounded-xl border bg-card p-8 shadow-sm ring-1 ring-rdc-navy/5">
        <div className="space-y-3 text-center">
          <img
            src="/logo.webp"
            alt="Ministère des Finances"
            className="mx-auto h-12 w-auto"
          />
          <h1 className="text-xl font-semibold text-rdc-navy">
            Espace Ministère
          </h1>
          <p className="text-sm text-muted-foreground">
            Connexion réservée aux agents du Ministère des Finances
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="text-sm">
            {error}
          </Alert>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              className="h-11"
              {...form.register("email")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              className="h-11"
              {...form.register("password")}
            />
          </div>
          <Button type="submit" className="h-11 w-full" disabled={loading}>
            {loading ? "Connexion…" : "Se connecter"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Investisseur ?{" "}
          <a href="/login" className="text-primary hover:underline">
            Espace client
          </a>
          {" · "}
          Banque ?{" "}
          <a href="/bank/login" className="text-primary hover:underline">
            Espace banque
          </a>
        </p>
      </div>
    </div>
  );
}
