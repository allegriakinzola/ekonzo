"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  LockKeyIcon,
  ShieldCheckIcon,
  SpinnerGapIcon,
  UserCircleIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Bank = {
  id: string;
  code: string;
  name: string;
  shortName: string;
  logoUrl: string | null;
};

type CurrentLink = {
  partnerBank: Bank;
  accountNumber: string;
  accountName: string;
  currency: string;
  fullName: string;
  linkedAt: string;
} | null;

const STEPS = [
  {
    icon: UserCircleIcon,
    title: "Choisissez votre banque",
    desc: "Parmi les banques partenaires agréées.",
  },
  {
    icon: LockKeyIcon,
    title: "Connectez-vous chez elle",
    desc: "E-mail et mot de passe de votre banque, jamais transmis à ekonzo.",
  },
  {
    icon: CheckCircleIcon,
    title: "Compte lié",
    desc: "Votre banque nous communique le titulaire et le n° de compte.",
  },
];

export function LinkBankChooser({
  banks,
  currentLink,
}: {
  banks: Bank[];
  currentLink: CurrentLink;
}) {
  const [error, setError] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function chooseBank(partnerBankId: string) {
    setLoadingId(partnerBankId);
    setError("");
    try {
      const res = await fetch("/api/bank-link/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerBankId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Impossible de démarrer");
      window.location.href = data.authorizeUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setLoadingId(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* Liaison actuelle */}
      {currentLink && (
        <Card className="ring-1 ring-emerald-100">
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <BankLogo
              logoUrl={currentLink.partnerBank.logoUrl}
              shortName={currentLink.partnerBank.shortName}
              size="lg"
            />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-semibold text-rdc-navy">
                  {currentLink.partnerBank.name}
                </p>
                <Badge
                  variant="outline"
                  className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700"
                >
                  <CheckCircleIcon className="size-3" weight="fill" />
                  Banque actuelle
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {currentLink.accountName}
                <span className="mx-1.5 text-border">·</span>
                <span className="font-mono">{currentLink.accountNumber}</span>
                <span className="mx-1.5 text-border">·</span>
                {currentLink.currency}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Étapes (uniquement en première liaison) */}
      {!currentLink && (
        <ol className="grid gap-3 sm:grid-cols-3">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <li
                key={step.title}
                className="relative rounded-xl border border-border/70 bg-card/60 p-4"
              >
                <div className="mb-3 flex items-center gap-2.5">
                  <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary ring-1 ring-primary/15">
                    {i + 1}
                  </span>
                  <Icon className="size-4 text-muted-foreground" weight="duotone" />
                </div>
                <p className="text-sm font-semibold text-rdc-navy">
                  {step.title}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {step.desc}
                </p>
              </li>
            );
          })}
        </ol>
      )}

      {error && (
        <Alert variant="destructive">
          <WarningCircleIcon className="size-4" weight="fill" />
          <AlertTitle>Connexion impossible</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Choix de la banque */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {currentLink ? "Autres banques partenaires" : "Banques partenaires"}
          </h2>
          <span className="text-xs text-muted-foreground">
            {banks.length} disponible{banks.length > 1 ? "s" : ""}
          </span>
        </div>

        {banks.length === 0 ? (
          <div className="rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
            Aucune banque partenaire active pour le moment.
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {banks.map((bank) => {
              const isCurrent = currentLink?.partnerBank.id === bank.id;
              const isLoading = loadingId === bank.id;
              return (
                <li key={bank.id}>
                  <button
                    type="button"
                    disabled={loadingId !== null || isCurrent}
                    onClick={() => chooseBank(bank.id)}
                    aria-current={isCurrent ? "true" : undefined}
                    className={cn(
                      "group flex w-full items-center gap-4 rounded-xl border bg-card p-4 text-left shadow-sm ring-1 ring-rdc-navy/5 transition-all",
                      isCurrent
                        ? "cursor-default border-emerald-200 bg-emerald-50/40 ring-emerald-100"
                        : "hover:border-primary/40 hover:shadow-md hover:ring-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                      loadingId !== null && !isLoading && "opacity-60",
                    )}
                  >
                    <BankLogo logoUrl={bank.logoUrl} shortName={bank.shortName} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-rdc-navy">
                        {bank.shortName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {bank.name}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "flex shrink-0 items-center gap-1 text-xs font-medium",
                        isCurrent ? "text-emerald-700" : "text-primary",
                      )}
                    >
                      {isLoading ? (
                        <SpinnerGapIcon className="size-4 animate-spin" weight="bold" />
                      ) : isCurrent ? (
                        <>
                          <CheckCircleIcon className="size-4" weight="fill" />
                          Liée
                        </>
                      ) : (
                        <>
                          Continuer
                          <ArrowRightIcon
                            className="size-3.5 transition-transform group-hover:translate-x-0.5"
                            weight="bold"
                          />
                        </>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Pied */}
      <div className="flex flex-col gap-4 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground sm:max-w-md">
          <ShieldCheckIcon className="mt-0.5 size-4 shrink-0" weight="duotone" />
          Vos identifiants bancaires sont saisis uniquement sur le site de votre
          banque. ekonzo ne reçoit que le titulaire, le numéro de compte et la
          devise.
        </p>
        <Button variant="outline" size="sm" render={<Link href="/profile" />}>
          Retour aux paramètres
        </Button>
      </div>
    </div>
  );
}

function BankLogo({
  logoUrl,
  shortName,
  size = "md",
}: {
  logoUrl: string | null;
  shortName: string;
  size?: "md" | "lg";
}) {
  const cls = size === "lg" ? "size-14" : "size-12";
  return logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl}
      alt={shortName}
      className={cn(cls, "shrink-0 rounded-lg border bg-white object-contain p-1")}
    />
  ) : (
    <div
      className={cn(
        cls,
        "flex shrink-0 items-center justify-center rounded-lg border bg-white text-sm font-bold text-rdc-navy",
      )}
    >
      {shortName.slice(0, 2).toUpperCase()}
    </div>
  );
}
