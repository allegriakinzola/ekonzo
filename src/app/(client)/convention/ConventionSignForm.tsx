"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  BankIcon,
  CheckCircleIcon,
  DownloadSimpleIcon,
  FileTextIcon,
  PenNibIcon,
  SpinnerIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { SignaturePad } from "./SignaturePad";

type SignatureMethod = "TYPED" | "DRAWN";
type Step = "bank" | "read" | "sign";

const STEPS: { id: Step; label: string; icon: typeof BankIcon }[] = [
  { id: "bank", label: "Banque", icon: BankIcon },
  { id: "read", label: "Convention", icon: FileTextIcon },
  { id: "sign", label: "Signature", icon: PenNibIcon },
];

type BankOption = {
  code: string;
  name: string;
  shortName: string;
  logoSrc: string;
};

type ConventionPayload = {
  convention: {
    id: string;
    version: string;
    title: string;
    partnerBankName: string;
    bodyMarkdown: string;
    effectiveFrom: string;
  };
  banks: BankOption[];
  signed: boolean;
  agreement: {
    id: string;
    signedName: string;
    signedAt: string;
    pdfSha256: string;
    signatureHash: string;
    partnerBankCode: string;
    partnerBankName: string;
  } | null;
  kycStatus: string;
  suggestedName: string;
};

function renderMarkdown(md: string) {
  return md.split(/\n+/).map((raw, i) => {
    const line = raw.trim();
    if (!line) return null;
    if (line.startsWith("## ")) {
      return (
        <h3
          key={i}
          className="mt-5 text-sm font-bold uppercase tracking-wide text-rdc-navy first:mt-0"
        >
          {line.slice(3)}
        </h3>
      );
    }
    if (line.startsWith("- ") || /^\d+\.\s/.test(line)) {
      return (
        <li
          key={i}
          className="ml-4 list-disc text-sm leading-relaxed text-foreground/90"
        >
          {line.replace(/^(-\s|\d+\.\s)/, "").replace(/\*\*(.*?)\*\*/g, "$1")}
        </li>
      );
    }
    const html = line.replace(
      /\*\*(.*?)\*\*/g,
      '<strong class="font-semibold text-rdc-navy">$1</strong>',
    );
    return (
      <p
        key={i}
        className="text-sm leading-relaxed text-foreground/90"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  });
}

export function ConventionSignForm() {
  const router = useRouter();
  const [data, setData] = useState<ConventionPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("bank");
  const [bankCode, setBankCode] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [electronicAck, setElectronicAck] = useState(false);
  const [signedName, setSignedName] = useState("");
  const [method, setMethod] = useState<SignatureMethod>("DRAWN");
  const [drawnSignature, setDrawnSignature] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  const loadConvention = useCallback(async (selectedBank?: string | null) => {
    const qs = selectedBank
      ? `?bank=${encodeURIComponent(selectedBank)}`
      : "";
    const res = await fetch(`/api/convention${qs}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Erreur de chargement");
    return json as ConventionPayload;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const base = await loadConvention();
        if (cancelled) return;
        const defaultBank =
          base.agreement?.partnerBankCode ??
          (base.banks.length === 1 ? base.banks[0].code : null);
        const json =
          defaultBank && !base.signed
            ? await loadConvention(defaultBank)
            : base;
        if (cancelled) return;
        setData(json);
        setSignedName(json.suggestedName ?? "");
        if (defaultBank) setBankCode(defaultBank);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Erreur");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadConvention]);

  async function selectBank(code: string) {
    setBankCode(code);
    setError(null);
    try {
      const json = await loadConvention(code);
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }

  const canSubmit = useMemo(() => {
    if (!bankCode || !accepted || !electronicAck || submitting) return false;
    if (signedName.trim().length < 3) return false;
    if (method === "DRAWN" && !drawnSignature) return false;
    return true;
  }, [
    bankCode,
    accepted,
    electronicAck,
    signedName,
    method,
    drawnSignature,
    submitting,
  ]);

  async function handleSign() {
    if (!bankCode) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/convention/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signedName: signedName.trim(),
          partnerBankCode: bankCode,
          accepted: true,
          signatureMethod: method,
          signatureImageDataUrl: method === "DRAWN" ? drawnSignature : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        const detail =
          typeof json.details === "object"
            ? JSON.stringify(json.details)
            : "";
        throw new Error(
          [json.error ?? "Échec de la signature", detail]
            .filter(Boolean)
            .join(" — "),
        );
      }
      const refreshed = await loadConvention(bankCode);
      setData(refreshed);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Card className="ring-1 ring-rdc-navy/5">
        <CardContent className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <SpinnerIcon className="size-5 animate-spin" />
          Chargement de la convention…
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Alert variant="destructive">
        <WarningCircleIcon className="size-4" weight="fill" />
        <AlertTitle>Impossible de charger la convention</AlertTitle>
        <AlertDescription>{error ?? "Réessayez plus tard."}</AlertDescription>
      </Alert>
    );
  }

  if (data.signed && data.agreement) {
    const bank =
      data.banks.find((b) => b.code === data.agreement?.partnerBankCode) ??
      null;
    return (
      <Card className="ring-1 ring-rdc-navy/5">
        <CardHeader className="border-b border-emerald-100 bg-emerald-50/60 [.border-b]:pb-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
              <CheckCircleIcon className="size-5" weight="fill" />
            </span>
            <div>
              <CardTitle className="text-base text-emerald-900">
                Convention signée et enregistrée
              </CardTitle>
              <CardDescription className="text-emerald-700">
                Version {data.convention.version} · signée le{" "}
                {new Date(data.agreement.signedAt).toLocaleString("fr-CD")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="flex items-center gap-4 rounded-xl border bg-white px-4 py-3">
            {bank?.logoSrc ? (
              <Image
                src={bank.logoSrc}
                alt={data.agreement.partnerBankName}
                width={140}
                height={48}
                className="h-10 w-auto object-contain"
              />
            ) : null}
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Banque teneuse du compte-titres
              </p>
              <p className="font-semibold text-rdc-navy">
                {data.agreement.partnerBankName}
              </p>
            </div>
          </div>
          <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
            <p className="text-[10px] uppercase text-muted-foreground">
              Signataire
            </p>
            <p className="font-semibold">{data.agreement.signedName}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              render={
                <a
                  href="/api/convention/pdf"
                  download
                  target="_blank"
                  rel="noreferrer"
                />
              }
            >
              <DownloadSimpleIcon className="size-4" weight="bold" />
              Télécharger le PDF de la convention
            </Button>
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              Continuer vers l&apos;application
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const selectedBank = data.banks.find((b) => b.code === bankCode) ?? null;

  return (
    <div className="space-y-5">
      {/* Stepper */}
      <div className="space-y-3">
        <div className="flex gap-1">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                stepIndex >= i ? "bg-primary" : "bg-muted",
              )}
            />
          ))}
        </div>
        <ol className="grid grid-cols-3 gap-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = step === s.id;
            const done = stepIndex > i;
            return (
              <li
                key={s.id}
                className={cn(
                  "flex flex-col items-center gap-1.5 text-center",
                  active
                    ? "text-primary"
                    : done
                      ? "text-rdc-navy"
                      : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "inline-flex size-9 items-center justify-center rounded-full text-sm font-bold ring-1",
                    active
                      ? "bg-primary text-white ring-primary"
                      : done
                        ? "bg-primary/10 text-primary ring-primary/20"
                        : "bg-muted ring-border",
                  )}
                >
                  {done ? (
                    <CheckCircleIcon className="size-5" weight="fill" />
                  ) : (
                    <Icon className="size-4" weight="duotone" />
                  )}
                </span>
                <span className="text-[11px] font-medium leading-tight sm:text-xs">
                  {i + 1}. {s.label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      {error && (
        <Alert variant="destructive">
          <WarningCircleIcon className="size-4" weight="fill" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription className="break-words">{error}</AlertDescription>
        </Alert>
      )}

      {/* Étape 1 — Banque */}
      {step === "bank" && (
        <Card className="ring-1 ring-rdc-navy/5">
          <CardHeader className="border-b [.border-b]:pb-4">
            <CardTitle className="text-base text-rdc-navy">
              Choisir la banque teneuse
            </CardTitle>
            <CardDescription>
              Votre compte-titres sera ouvert et tenu dans les livres de la
              banque sélectionnée.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid gap-3">
              {data.banks.map((bank) => {
                const selected = bankCode === bank.code;
                return (
                  <button
                    key={bank.code}
                    type="button"
                    onClick={() => selectBank(bank.code)}
                    className={cn(
                      "flex items-center gap-4 rounded-xl border px-4 py-4 text-left transition",
                      selected
                        ? "border-rdc-navy bg-rdc-navy/[0.03] ring-2 ring-rdc-navy/20"
                        : "border-border hover:border-rdc-navy/30 hover:bg-muted/40",
                    )}
                  >
                    <span className="flex h-14 w-40 shrink-0 items-center justify-center rounded-lg bg-white p-2 ring-1 ring-black/5">
                      <Image
                        src={bank.logoSrc}
                        alt={bank.shortName}
                        width={150}
                        height={48}
                        className="h-10 w-auto object-contain"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-rdc-navy">
                        {bank.shortName}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {bank.name}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full border",
                        selected
                          ? "border-rdc-navy bg-rdc-navy text-white"
                          : "border-muted-foreground/40",
                      )}
                    >
                      {selected ? (
                        <CheckCircleIcon className="size-4" weight="fill" />
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
            <Button
              className="w-full"
              size="lg"
              disabled={!bankCode}
              onClick={() => setStep("read")}
            >
              Continuer
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Étape 2 — Lecture */}
      {step === "read" && (
        <Card className="ring-1 ring-rdc-navy/5">
          <CardHeader className="border-b [.border-b]:pb-4">
            <div className="flex items-start gap-3">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileTextIcon className="size-5" weight="duotone" />
              </span>
              <div className="min-w-0">
                <CardTitle className="text-base text-rdc-navy">
                  {data.convention.title}
                </CardTitle>
                <CardDescription>
                  Version {data.convention.version}
                  {selectedBank ? (
                    <>
                      {" "}
                      · Tenue au nom de{" "}
                      <span className="font-medium text-foreground">
                        {data.convention.partnerBankName}
                      </span>
                    </>
                  ) : null}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="max-h-[min(55vh,480px)] space-y-2 overflow-y-auto rounded-lg border bg-muted/20 p-4">
              {renderMarkdown(data.convention.bodyMarkdown)}
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("bank")}
              >
                Retour
              </Button>
              <Button
                className="sm:min-w-[160px]"
                size="lg"
                onClick={() => setStep("sign")}
              >
                J&apos;ai lu, continuer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Étape 3 — Signature */}
      {step === "sign" && (
        <Card className="ring-1 ring-rdc-navy/5">
          <CardHeader className="border-b [.border-b]:pb-4">
            <CardTitle className="text-base">Signature électronique</CardTitle>
            <CardDescription>
              Acceptez la convention, puis signez (dessin ou nom tapé).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {selectedBank ? (
              <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                <Image
                  src={selectedBank.logoSrc}
                  alt=""
                  width={80}
                  height={28}
                  className="h-7 w-auto object-contain"
                />
                <span className="text-muted-foreground">
                  Banque :{" "}
                  <strong className="text-foreground">
                    {selectedBank.shortName}
                  </strong>
                </span>
              </div>
            ) : null}

            <div className="flex items-start gap-3">
              <Checkbox
                id="accept"
                checked={accepted}
                onCheckedChange={(v) => setAccepted(v === true)}
              />
              <Label
                htmlFor="accept"
                className="text-sm leading-snug font-normal"
              >
                J&apos;ai lu et j&apos;accepte l&apos;intégralité de la
                convention de compte-titres.
              </Label>
            </div>
            <div className="flex items-start gap-3">
              <Checkbox
                id="electronic"
                checked={electronicAck}
                onCheckedChange={(v) => setElectronicAck(v === true)}
              />
              <Label
                htmlFor="electronic"
                className="text-sm leading-snug font-normal"
              >
                Je reconnais la valeur juridique de ma signature électronique
                et demande qu&apos;une copie PDF me soit remise.
              </Label>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="signedName">Nom et prénom du signataire</Label>
              <Input
                id="signedName"
                value={signedName}
                onChange={(e) => setSignedName(e.target.value)}
                placeholder="Ex. Jean Mukendi"
                maxLength={120}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/50 p-1">
              <button
                type="button"
                onClick={() => setMethod("DRAWN")}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition",
                  method === "DRAWN"
                    ? "bg-white text-rdc-navy shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Dessiner ma signature
              </button>
              <button
                type="button"
                onClick={() => setMethod("TYPED")}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition",
                  method === "TYPED"
                    ? "bg-white text-rdc-navy shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Taper mon nom
              </button>
            </div>

            {method === "DRAWN" ? (
              <div className="space-y-2">
                <Label>Signature manuscrite</Label>
                <SignaturePad onChange={setDrawnSignature} />
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-rdc-navy/25 bg-white px-4 py-8 text-center">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Aperçu de la signature électronique
                </p>
                <p className="mt-2 font-serif text-2xl italic text-rdc-navy">
                  {signedName.trim() || "Votre nom apparaîtra ici"}
                </p>
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("read")}
              >
                Retour
              </Button>
              <Button
                className="sm:min-w-[220px]"
                size="lg"
                disabled={!canSubmit}
                onClick={handleSign}
              >
                {submitting ? (
                  <>
                    <SpinnerIcon className="size-4 animate-spin" />
                    Signature en cours…
                  </>
                ) : (
                  "Signer et ouvrir mon compte-titres"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
