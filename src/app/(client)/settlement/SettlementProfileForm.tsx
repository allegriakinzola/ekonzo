"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BankIcon,
  CheckCircleIcon,
  DeviceMobileIcon,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Channel = "MOBILE_MONEY" | "BANK_TRANSFER";

type Profile = {
  preferredChannel: Channel;
  momoPhone: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  isComplete: boolean;
  updatedAt: string | null;
};

export function SettlementProfileForm({
  initialProfile,
}: {
  initialProfile: Profile;
}) {
  const router = useRouter();
  const [channel, setChannel] = useState<Channel>(
    initialProfile.preferredChannel,
  );
  const [momoPhone, setMomoPhone] = useState(initialProfile.momoPhone ?? "");
  const [bankName, setBankName] = useState(initialProfile.bankName ?? "");
  const [bankAccountNumber, setBankAccountNumber] = useState(
    initialProfile.bankAccountNumber ?? "",
  );
  const [bankAccountName, setBankAccountName] = useState(
    initialProfile.bankAccountName ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setChannel(initialProfile.preferredChannel);
    setMomoPhone(initialProfile.momoPhone ?? "");
    setBankName(initialProfile.bankName ?? "");
    setBankAccountNumber(initialProfile.bankAccountNumber ?? "");
    setBankAccountName(initialProfile.bankAccountName ?? "");
  }, [initialProfile]);

  const canSave = useMemo(() => {
    if (saving) return false;
    if (channel === "MOBILE_MONEY") return momoPhone.trim().length >= 9;
    return bankName.trim().length >= 2 && bankAccountNumber.trim().length >= 5;
  }, [channel, momoPhone, bankName, bankAccountNumber, saving]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const res = await fetch("/api/settlement-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferredChannel: channel,
          momoPhone: momoPhone.trim() || null,
          bankName: bankName.trim() || null,
          bankAccountNumber: bankAccountNumber.trim() || null,
          bankAccountName: bankAccountName.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Échec de l'enregistrement");
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <WarningCircleIcon className="size-4" weight="fill" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {saved && (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-950">
          <CheckCircleIcon className="size-4 text-emerald-700" weight="fill" />
          <AlertTitle className="text-emerald-900">Profil enregistré</AlertTitle>
          <AlertDescription className="text-emerald-800">
            Ces coordonnées seront proposées automatiquement à chaque
            souscription.
          </AlertDescription>
        </Alert>
      )}

      <Card className="ring-1 ring-rdc-navy/5">
        <CardHeader className="border-b [.border-b]:pb-4">
          <CardTitle className="text-base text-rdc-navy">
            Canal de règlement préféré
          </CardTitle>
          <CardDescription>
            Choisissez comment vous souhaitez régler vos souscriptions aux bons
            du Trésor.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                {
                  value: "MOBILE_MONEY" as const,
                  label: "Mobile Money",
                  Icon: DeviceMobileIcon,
                },
                {
                  value: "BANK_TRANSFER" as const,
                  label: "Virement / RIB",
                  Icon: BankIcon,
                },
              ] as const
            ).map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setChannel(value)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition",
                  channel === value
                    ? "border-rdc-navy bg-rdc-navy/[0.04] text-rdc-navy ring-2 ring-rdc-navy/15"
                    : "border-border text-muted-foreground hover:border-rdc-navy/30",
                )}
              >
                <Icon className="size-5" weight="duotone" />
                {label}
              </button>
            ))}
          </div>

          {channel === "MOBILE_MONEY" ? (
            <div className="space-y-1.5">
              <Label htmlFor="momoPhone">Numéro Mobile Money</Label>
              <Input
                id="momoPhone"
                value={momoPhone}
                onChange={(e) => setMomoPhone(e.target.value)}
                placeholder="812345678"
                inputMode="numeric"
                maxLength={9}
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                9 chiffres, sans 0 ni +243. L&apos;opérateur (Airtel, Orange,
                M-Pesa) est détecté automatiquement.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="bankName">Votre banque</Label>
                <Input
                  id="bankName"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Ex. Equity BCDC, Rawbank…"
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bankAccountNumber">Numéro de compte (RIB)</Label>
                <Input
                  id="bankAccountNumber"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  placeholder="Ex. 00123456789"
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bankAccountName">Nom du titulaire</Label>
                <Input
                  id="bankAccountName"
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value)}
                  placeholder="Nom figurant sur le compte"
                  className="h-11"
                />
              </div>
            </div>
          )}

          <div className="rounded-lg border border-dashed border-rdc-navy/20 bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
            Vous pouvez aussi renseigner les deux canaux : le canal préféré
            sera proposé en premier, l&apos;autre reste disponible à la
            souscription.
          </div>

          {channel === "MOBILE_MONEY" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="bankNameOpt">Banque (optionnel)</Label>
                <Input
                  id="bankNameOpt"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Pour un futur virement"
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bankAccountOpt">N° compte (optionnel)</Label>
                <Input
                  id="bankAccountOpt"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  placeholder="RIB de secours"
                  className="h-11"
                />
              </div>
            </div>
          )}

          {channel === "BANK_TRANSFER" && (
            <div className="space-y-1.5">
              <Label htmlFor="momoPhoneOpt">Mobile Money (optionnel)</Label>
              <Input
                id="momoPhoneOpt"
                value={momoPhone}
                onChange={(e) => setMomoPhone(e.target.value)}
                placeholder="812345678"
                inputMode="numeric"
                maxLength={9}
                className="h-11"
              />
            </div>
          )}

          <Button type="submit" className="h-11" disabled={!canSave}>
            {saving ? (
              <>
                <SpinnerIcon className="size-4 animate-spin" />
                Enregistrement…
              </>
            ) : (
              "Enregistrer mon profil de règlement"
            )}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
