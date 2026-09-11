"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert } from "@/components/ui/alert";

export default function LinkBankCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    if (!code || !state) {
      setError("Retour banque invalide (code ou state manquant).");
      return;
    }

    fetch("/api/bank-link/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, state }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Liaison échouée");
        router.replace("/profile");
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Liaison échouée"),
      );
  }, [searchParams, router]);

  return (
    <div className="mx-auto max-w-md space-y-4 py-16 text-center">
      <h1 className="text-xl font-semibold text-rdc-navy">
        Finalisation de la liaison…
      </h1>
      {error ? (
        <Alert variant="destructive" className="text-sm text-left">
          {error}
          <div className="mt-3">
            <a href="/profile/bank" className="underline">
              Réessayer
            </a>
          </div>
        </Alert>
      ) : (
        <p className="text-sm text-muted-foreground">
          Connexion sécurisée avec votre banque en cours.
        </p>
      )}
    </div>
  );
}
