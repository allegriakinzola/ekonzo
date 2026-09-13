"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CheckIcon,
  CopyIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowsClockwiseIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function CopyField({
  label,
  value,
  secret,
  mono,
}: {
  label: string;
  value: string;
  secret?: boolean;
  mono?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(!secret);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  const display =
    secret && !revealed
      ? "•".repeat(Math.min(value.length || 28, 28))
      : value || "—";

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
        <code
          className={cn(
            "min-w-0 flex-1 truncate text-sm text-rdc-navy",
            mono && "font-mono text-[13px]",
          )}
        >
          {display}
        </code>
        {secret && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={() => setRevealed((v) => !v)}
          >
            {revealed ? (
              <EyeSlashIcon className="size-4" />
            ) : (
              <EyeIcon className="size-4" />
            )}
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={copy}
          disabled={!value}
        >
          {copied ? (
            <CheckIcon className="size-4 text-emerald-600" weight="bold" />
          ) : (
            <CopyIcon className="size-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

export function IntegrationCredentials({
  bankCode,
  clientId,
  clientSecret,
  authorizeUrl,
  tokenUrl,
  userinfoUrl,
  paymentUrl,
  ekonzoApiUrl,
}: {
  bankCode: string;
  clientId: string;
  clientSecret: string;
  authorizeUrl: string | null;
  tokenUrl: string | null;
  userinfoUrl: string | null;
  paymentUrl: string | null;
  /** Base publique ekonzo (ex. https://www.ekonzo.site) */
  ekonzoApiUrl: string;
}) {
  const router = useRouter();
  const [id, setId] = useState(clientId);
  const [secret, setSecret] = useState(clientSecret);
  const [regenerating, setRegenerating] = useState(false);
  const [message, setMessage] = useState("");

  const base = `${ekonzoApiUrl}/api/v1/banks/${bankCode}`;

  async function regenerate() {
    if (
      !window.confirm(
        "Régénérer les clés ? Les anciennes (client_id / secret) cesseront de fonctionner immédiatement.",
      )
    ) {
      return;
    }
    setRegenerating(true);
    setMessage("");
    try {
      const res = await fetch("/api/bank/credentials/regenerate", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Régénération impossible");
      setId(data.oauthClientId);
      setSecret(data.oauthClientSecret);
      setMessage("Nouvelles clés générées — mettez à jour votre portail bancaire.");
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erreur");
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-xl text-sm text-muted-foreground">
          Identifiants générés automatiquement à l&apos;enregistrement de la
          banque. Copiez-les dans votre application bancaire — ne les partagez
          pas.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={regenerate}
          disabled={regenerating}
        >
          <ArrowsClockwiseIcon
            className={cn("size-4", regenerating && "animate-spin")}
          />
          {regenerating ? "Génération…" : "Régénérer les clés"}
        </Button>
      </div>
      {message && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {message}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <CopyField label="Code banque" value={bankCode} mono />
        <CopyField label="OAuth client_id" value={id} mono />
        <CopyField
          label="OAuth client_secret"
          value={secret}
          secret
          mono
        />
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm ring-1 ring-rdc-navy/5">
        <h3 className="text-sm font-semibold text-rdc-navy">
          Endpoints ekonzo (à appeler depuis votre application)
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          URL publique ekonzo — à coller dans la configuration de votre portail
          bancaire (<code>EKONZO_API_URL</code>).
        </p>
        <div className="mt-4 grid gap-3">
          <CopyField label="EKONZO_API_URL" value={ekonzoApiUrl} mono />
          <CopyField
            label="Sessions de paiement (GET)"
            value={`${base}/payments/sessions?token=…`}
            mono
          />
          <CopyField
            label="Notify paiement (POST)"
            value={`${base}/payments/notify`}
            mono
          />
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm ring-1 ring-rdc-navy/5">
        <h3 className="text-sm font-semibold text-rdc-navy">
          Vos pages enregistrées chez ekonzo
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Bases sans paramètres — ekonzo ajoute les query params. Modifiez-les
          dans{" "}
          <a href="/bank/pages" className="font-medium text-rdc-navy underline">
            Pages banque
          </a>
          .
        </p>
        <div className="mt-4 grid gap-3">
          <CopyField label="authorizeUrl" value={authorizeUrl ?? ""} mono />
          <CopyField label="tokenUrl" value={tokenUrl ?? ""} mono />
          <CopyField label="userinfoUrl" value={userinfoUrl ?? ""} mono />
          <CopyField label="paymentUrl" value={paymentUrl ?? ""} mono />
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950">
        <p className="font-semibold">Variables d&apos;environnement typiques</p>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-white/80 p-3 font-mono text-[11px] leading-relaxed text-amber-950">
{`EKONZO_CLIENT_ID="${id}"
EKONZO_CLIENT_SECRET="${secret}"
EKONZO_BANK_CODE="${bankCode}"
EKONZO_API_URL="${ekonzoApiUrl}"`}
        </pre>
      </div>
    </div>
  );
}
