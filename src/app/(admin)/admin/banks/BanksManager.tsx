"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";

export type BankRow = {
  id: string;
  code: string;
  name: string;
  shortName: string;
  email: string;
  logoUrl: string | null;
  isActive: boolean;
  activatedAt: string | null;
  createdAt: string;
  linkedClients: number;
  paidPayments: number;
};

function isBrokenLogo(url: string | null) {
  return !!url && url.startsWith("/uploads/");
}

function isUsableLogo(url: string | null) {
  return (
    !!url &&
    (url.startsWith("data:") ||
      url.startsWith("http://") ||
      url.startsWith("https://"))
  );
}

export function BanksManager({ initialBanks }: { initialBanks: BankRow[] }) {
  const router = useRouter();
  const [banks, setBanks] = useState(initialBanks);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const logoInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [authorizeUrl, setAuthorizeUrl] = useState(
    "http://localhost:3001/oauth/authorize",
  );
  const [tokenUrl, setTokenUrl] = useState(
    "http://localhost:3001/api/oauth/token",
  );
  const [userinfoUrl, setUserinfoUrl] = useState(
    "http://localhost:3001/api/oauth/userinfo",
  );

  const hasBrokenLogos = banks.some((b) => isBrokenLogo(b.logoUrl));

  function resetForm() {
    setName("");
    setShortName("");
    setCode("");
    setEmail("");
    setPassword("");
    setLogo(null);
    setError("");
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (password.length < 8) {
        throw new Error("Mot de passe : 8 caractères minimum");
      }

      const form = new FormData();
      form.set("name", name);
      form.set("shortName", shortName);
      form.set("code", code || shortName);
      form.set("email", email);
      form.set("password", password);
      form.set("authorizeUrl", authorizeUrl);
      form.set("tokenUrl", tokenUrl);
      form.set("userinfoUrl", userinfoUrl);
      if (logo) form.set("logo", logo);

      const res = await fetch("/api/admin/banks", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Création impossible");

      setBanks((prev) => [
        {
          ...data,
          linkedClients: 0,
          paidPayments: 0,
        },
        ...prev,
      ]);
      resetForm();
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    setActionId(id);
    try {
      const res = await fetch(`/api/admin/banks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Mise à jour impossible");
      setBanks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, isActive: data.isActive } : b)),
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur");
    } finally {
      setActionId(null);
    }
  }

  async function uploadLogo(id: string, file: File) {
    if (file.size > 512 * 1024) {
      alert("Logo trop volumineux (maximum 512 Ko)");
      return;
    }
    setActionId(id);
    try {
      const form = new FormData();
      form.set("logo", file);
      const res = await fetch(`/api/admin/banks/${id}`, {
        method: "PATCH",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload impossible");
      setBanks((prev) =>
        prev.map((b) =>
          b.id === id ? { ...b, logoUrl: data.logoUrl ?? b.logoUrl } : b,
        ),
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur");
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="space-y-4">
      {hasBrokenLogos && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900 text-sm">
          Certains logos ont été enregistrés en local (`/uploads/…`) et ne sont
          pas disponibles en production. Utilisez « Charger le logo » pour les
          recharger (stockage durable).
        </Alert>
      )}

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-rdc-navy">
            Banques enregistrées
          </h2>
          <p className="text-xs text-muted-foreground">
            {banks.length} banque{banks.length > 1 ? "s" : ""} · les banques
            désactivées ne sont plus proposées aux investisseurs
          </p>
        </div>
        <Button type="button" onClick={() => setOpen((v) => !v)}>
          {open ? "Annuler" : "Ajouter une banque"}
        </Button>
      </div>

      {open && (
        <form
          onSubmit={onCreate}
          className="space-y-4 rounded-xl border bg-card p-5 shadow-sm ring-1 ring-rdc-navy/5"
        >
          <h2 className="text-base font-semibold text-rdc-navy">
            Nouvelle banque partenaire
          </h2>
          <p className="text-sm text-muted-foreground">
            Le compte BANK est créé immédiatement avec l&apos;e-mail et le mot
            de passe fournis — aucun e-mail d&apos;invitation n&apos;est envoyé.
          </p>
          {error && (
            <Alert variant="destructive" className="text-sm">
              {error}
            </Alert>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Raison sociale</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Banque Commerciale du Congo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shortName">Sigle</Label>
              <Input
                id="shortName"
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                required
                placeholder="BCDC"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Code (optionnel)</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="BCDC"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Identifiant de connexion (e-mail)</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="tresorerie@banque.cd"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="8 caractères minimum"
              />
            </div>
            <div className="space-y-2 sm:col-span-2 rounded-lg border border-dashed border-rdc-navy/20 bg-muted/30 p-3">
              <p className="text-xs font-semibold text-rdc-navy">
                Intégration API (portail de la banque)
              </p>
              <p className="text-[11px] text-muted-foreground">
                Indiquez les URLs OAuth du portail bancaire. Les clés{" "}
                <code className="text-[10px]">client_id</code> /{" "}
                <code className="text-[10px]">client_secret</code> sont générées
                automatiquement à la création (visibles ensuite dans l&apos;espace
                banque).
              </p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="authorizeUrl">URL authorize</Label>
              <Input
                id="authorizeUrl"
                value={authorizeUrl}
                onChange={(e) => setAuthorizeUrl(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tokenUrl">URL token</Label>
              <Input
                id="tokenUrl"
                value={tokenUrl}
                onChange={(e) => setTokenUrl(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="userinfoUrl">URL userinfo</Label>
              <Input
                id="userinfoUrl"
                value={userinfoUrl}
                onChange={(e) => setUserinfoUrl(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="logo">Logo de la banque</Label>
              <Input
                id="logo"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={(e) => setLogo(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">
                PNG, JPG, WebP ou SVG · max 512 Ko — stocké de façon durable
                (visible en production)
              </p>
            </div>
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Création…" : "Créer la banque"}
          </Button>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm ring-1 ring-rdc-navy/5">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="px-4">Banque</TableHead>
              <TableHead className="px-4">Identifiant</TableHead>
              <TableHead className="px-4 text-right">Clients liés</TableHead>
              <TableHead className="px-4 text-right">Paiements</TableHead>
              <TableHead className="px-4">Statut</TableHead>
              <TableHead className="px-4">Créée le</TableHead>
              <TableHead className="px-4 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {banks.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-muted-foreground"
                >
                  Aucune banque partenaire pour le moment.
                </TableCell>
              </TableRow>
            )}
            {banks.map((bank) => (
              <TableRow key={bank.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {isUsableLogo(bank.logoUrl) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={bank.logoUrl!}
                        alt=""
                        className="h-9 w-9 rounded-md border object-contain bg-white p-0.5"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-md border bg-muted text-xs font-bold text-muted-foreground">
                        {bank.shortName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-medium leading-tight">{bank.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {bank.shortName} · {bank.code}
                      </p>
                      {isBrokenLogo(bank.logoUrl) && (
                        <p className="text-[11px] font-medium text-amber-700">
                          Logo à recharger
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{bank.email}</TableCell>
                <TableCell className="text-right text-sm font-semibold tabular-nums">
                  {bank.linkedClients}
                </TableCell>
                <TableCell className="text-right text-sm font-semibold tabular-nums">
                  {bank.paidPayments}
                </TableCell>
                <TableCell>
                  {bank.activatedAt ? (
                    <Badge
                      variant="outline"
                      className={
                        bank.isActive
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-amber-200 bg-amber-50 text-amber-700"
                      }
                    >
                      {bank.isActive ? "Active" : "Désactivée"}
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-slate-200 bg-slate-50 text-slate-600"
                    >
                      En attente
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDate(new Date(bank.createdAt))}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <input
                      ref={(el) => {
                        logoInputRefs.current[bank.id] = el;
                      }}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (file) void uploadLogo(bank.id, file);
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={actionId === bank.id}
                      onClick={() => logoInputRefs.current[bank.id]?.click()}
                    >
                      <ImageIcon className="size-3.5" weight="bold" />
                      {isBrokenLogo(bank.logoUrl) || !bank.logoUrl
                        ? "Charger le logo"
                        : "Changer le logo"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={actionId === bank.id}
                      onClick={() => toggleActive(bank.id, bank.isActive)}
                    >
                      {bank.isActive ? "Désactiver" : "Activer"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
