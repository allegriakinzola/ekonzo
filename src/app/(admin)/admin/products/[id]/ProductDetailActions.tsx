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
    OPEN: "Le produit devient visible et souscriptible par les investisseurs.",
    CLOSED:
      "La période de souscription est terminée. Les investisseurs ne peuvent plus souscrire.",
    ADJUDICATED:
      "Les souscriptions sont traitées. Vous pouvez maintenant adjuger individuellement.",
    ACTIVE: "Le produit est actif — les investisseurs détiennent leurs titres.",
    MATURED:
      "Le produit est arrivé à maturité. Le capital est à rembourser.",
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
      <CardHeader>
        <CardTitle className="text-base">Faire avancer le statut</CardTitle>
        <CardDescription>{DESCRIPTIONS[nextStatus]}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handleTransition}
          disabled={loading}
          className={buttonClass[nextStatus] ?? ""}
        >
          <ArrowRightIcon weight="bold" />
          {loading ? "…" : `Passer en « ${nextLabel} »`}
        </Button>
      </CardContent>
    </Card>
  );
}
