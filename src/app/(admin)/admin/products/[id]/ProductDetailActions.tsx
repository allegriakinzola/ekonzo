"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRightIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ProductDetailActions({
  productId,
  nextStatus,
  nextLabel,
}: {
  productId: string;
  currentStatus: string;
  nextStatus: string;
  nextLabel: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleTransition() {
    setLoading(true);
    await fetch(`/api/admin/products/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    setLoading(false);
    router.refresh();
  }

  const DESCRIPTIONS: Record<string, string> = {
    OPEN: "L'annonce devient visible et les investisseurs peuvent souscrire via leur banque partenaire.",
    CLOSED:
      "La période de souscription est terminée. Les banques transmettent les soumissions à la BCC.",
    ADJUDICATED:
      "Résultats de l'adjudication BCC reçus. Enregistrez les montants retenus dossier par dossier depuis les souscriptions.",
    ACTIVE:
      "Les titres sont émis — les investisseurs détiennent leurs Bons / Obligations.",
    MATURED:
      "L'émission est arrivée à échéance. Le nominal est remboursé aux investisseurs.",
  };

  const buttonClass: Record<string, string> = {
    OPEN: "bg-emerald-600 text-white hover:bg-emerald-700",
    CLOSED: "bg-amber-600 text-white hover:bg-amber-700",
    ADJUDICATED: "bg-primary text-primary-foreground hover:bg-primary/90",
    ACTIVE: "bg-rdc-navy text-white hover:bg-rdc-navy/90",
    MATURED: "bg-muted-foreground text-white hover:bg-muted-foreground/90",
  };

  return (
    <Card className="ring-1 ring-rdc-navy/5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CardHeader className="flex-1">
          <CardTitle className="text-base">Étape suivante</CardTitle>
          <CardDescription>{DESCRIPTIONS[nextStatus]}</CardDescription>
        </CardHeader>
        <CardContent className="sm:pt-6">
          <Button
            onClick={handleTransition}
            disabled={loading}
            className={buttonClass[nextStatus] ?? ""}
          >
            <ArrowRightIcon weight="bold" />
            {loading ? "…" : `Passer en « ${nextLabel} »`}
          </Button>
        </CardContent>
      </div>
    </Card>
  );
}
