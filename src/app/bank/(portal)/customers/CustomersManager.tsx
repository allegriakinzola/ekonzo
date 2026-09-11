"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

export type CustomerRow = {
  id: string;
  email: string;
  fullName: string;
  accountNumber: string;
  accountName: string;
  currency: "CDF" | "USD";
  isActive: boolean;
  createdAt: string;
};

export function CustomersManager({
  initialCustomers,
}: {
  initialCustomers: CustomerRow[];
}) {
  const router = useRouter();
  const [customers, setCustomers] = useState(initialCustomers);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [currency, setCurrency] = useState<"CDF" | "USD">("CDF");

  function reset() {
    setEmail("");
    setPassword("");
    setFullName("");
    setAccountNumber("");
    setAccountName("");
    setCurrency("CDF");
    setError("");
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/bank/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          fullName,
          accountNumber,
          accountName: accountName || fullName,
          currency,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Création impossible");
      setCustomers((prev) => [
        { ...data, createdAt: new Date(data.createdAt).toISOString() },
        ...prev,
      ]);
      reset();
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
      const res = await fetch(`/api/bank/customers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Mise à jour impossible");
      setCustomers((prev) =>
        prev.map((c) => (c.id === id ? { ...c, isActive: data.isActive } : c)),
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur");
    } finally {
      setActionId(null);
    }
  }

  async function remove(id: string) {
    if (!confirm("Supprimer ce client bancaire ?")) return;
    setActionId(id);
    try {
      const res = await fetch(`/api/bank/customers/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Suppression impossible");
      setCustomers((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur");
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" onClick={() => setOpen((v) => !v)}>
          {open ? "Annuler" : "Ajouter un client"}
        </Button>
      </div>

      {open && (
        <form
          onSubmit={onCreate}
          className="space-y-4 rounded-xl border bg-card p-5 shadow-sm ring-1 ring-rdc-navy/5"
        >
          <h2 className="text-base font-semibold text-rdc-navy">
            Nouveau client bancaire (simulation)
          </h2>
          <p className="text-sm text-muted-foreground">
            Ces identifiants servent à la connexion OAuth depuis ekonzo (e-mail
            + mot de passe).
          </p>
          {error && (
            <Alert variant="destructive" className="text-sm">
              {error}
            </Alert>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="fullName">Nom complet</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail de connexion</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountNumber">N° de compte</Label>
              <Input
                id="accountNumber"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountName">Nom du titulaire</Label>
              <Input
                id="accountName"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Identique au nom si vide"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Devise</Label>
              <select
                id="currency"
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                value={currency}
                onChange={(e) =>
                  setCurrency(e.target.value === "USD" ? "USD" : "CDF")
                }
              >
                <option value="CDF">CDF</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Création…" : "Créer le client"}
          </Button>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm ring-1 ring-rdc-navy/5">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Compte</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Créé</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-10 text-center text-muted-foreground"
                >
                  Aucun client simulé. Créez-en pour tester la liaison ekonzo.
                </TableCell>
              </TableRow>
            )}
            {customers.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <p className="font-medium">{c.fullName}</p>
                  <p className="text-xs text-muted-foreground">{c.email}</p>
                </TableCell>
                <TableCell className="text-sm">
                  {c.accountNumber}
                  <br />
                  <span className="text-xs text-muted-foreground">
                    {c.accountName} · {c.currency}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      c.isActive
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-slate-50 text-slate-600"
                    }
                  >
                    {c.isActive ? "Actif" : "Inactif"}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDate(c.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={actionId === c.id}
                      onClick={() => toggleActive(c.id, c.isActive)}
                    >
                      {c.isActive ? "Désactiver" : "Activer"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={actionId === c.id}
                      onClick={() => remove(c.id)}
                    >
                      Supprimer
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
