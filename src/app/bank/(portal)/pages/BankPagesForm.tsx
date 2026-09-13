"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Pages = {
  authorizeUrl: string;
  tokenUrl: string;
  userinfoUrl: string;
  paymentUrl: string;
};

const FIELDS: {
  key: keyof Pages;
  label: string;
  hint: string;
  params: string;
}[] = [
  {
    key: "authorizeUrl",
    label: "Page OAuth authorize",
    hint: "Login client pour lier le compte",
    params: "response_type, client_id, redirect_uri, state",
  },
  {
    key: "tokenUrl",
    label: "Endpoint token",
    hint: "Échange code → access_token (serveur)",
    params: "grant_type, code, redirect_uri, client_id, client_secret",
  },
  {
    key: "userinfoUrl",
    label: "Endpoint userinfo",
    hint: "Profil compte après OAuth",
    params: "Authorization: Bearer …",
  },
  {
    key: "paymentUrl",
    label: "Page de paiement",
    hint: "UI où l’investisseur règle la souscription",
    params: "token, client_id",
  },
];

export function BankPagesForm({ initial }: { initial: Pages }) {
  const router = useRouter();
  const [values, setValues] = useState<Pages>(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/bank/pages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Enregistrement impossible");
      setValues({
        authorizeUrl: data.authorizeUrl ?? "",
        tokenUrl: data.tokenUrl ?? "",
        userinfoUrl: data.userinfoUrl ?? "",
        paymentUrl: data.paymentUrl ?? "",
      });
      setMessage("Pages enregistrées. ekonzo construira les liens avec les paramètres.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSave} className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Indiquez uniquement l’URL de base de chaque page (sans paramètres). ekonzo
        y ajoutera automatiquement les query params nécessaires.
      </p>

      <div className="space-y-5">
        {FIELDS.map((field) => (
          <div key={field.key} className="space-y-2 rounded-xl border bg-card p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <Label htmlFor={field.key} className="text-rdc-navy">
                {field.label}
              </Label>
              <span className="font-mono text-[11px] text-muted-foreground">
                + {field.params}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{field.hint}</p>
            <Input
              id={field.key}
              type="url"
              required
              placeholder="https://votre-banque.example/…"
              value={values[field.key]}
              onChange={(e) =>
                setValues((v) => ({ ...v, [field.key]: e.target.value }))
              }
              className="font-mono text-sm"
            />
          </div>
        ))}
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {error}
        </p>
      )}
      {message && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
          {message}
        </p>
      )}

      <Button type="submit" disabled={saving}>
        {saving ? "Enregistrement…" : "Enregistrer les pages"}
      </Button>
    </form>
  );
}
