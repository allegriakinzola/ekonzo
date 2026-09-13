import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircleIcon, WarningCircleIcon } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatAmount } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export default async function PaymentReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ subscriptionId?: string }>;
}) {
  const session = await requireRole("CLIENT");
  const { subscriptionId } = await searchParams;
  if (!subscriptionId) notFound();

  const subscription = await prisma.subscription.findFirst({
    where: { id: subscriptionId, userId: session.user.id },
    include: {
      product: {
        select: {
          code: true,
          lineLabel: true,
          isin: true,
          currency: true,
        },
      },
      paymentSession: {
        include: {
          partnerBank: {
            select: { shortName: true, name: true, logoUrl: true },
          },
        },
      },
    },
  });
  if (!subscription) notFound();

  const paid = subscription.status === "PAYMENT_CONFIRMED";
  const amount = Number(
    subscription.settlementAmount ?? subscription.amount,
  );
  const label =
    subscription.product.lineLabel ??
    subscription.product.isin ??
    subscription.product.code;
  const bank = subscription.paymentSession?.partnerBank;

  return (
    <div className="mx-auto max-w-lg space-y-6 py-8">
      <Card className="ring-1 ring-rdc-navy/5">
        <CardHeader className="text-center">
          <div
            className={
              paid
                ? "mx-auto mb-3 flex size-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                : "mx-auto mb-3 flex size-16 items-center justify-center rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-100"
            }
          >
            {paid ? (
              <CheckCircleIcon className="size-8" weight="fill" />
            ) : (
              <WarningCircleIcon className="size-8" weight="fill" />
            )}
          </div>
          <CardTitle className="text-xl text-rdc-navy">
            {paid ? "Paiement confirmé" : "Paiement non abouti"}
          </CardTitle>
          <CardDescription>
            {paid
              ? bank
                ? `${bank.shortName} a notifié ekonzo du règlement.`
                : "Votre banque a notifié ekonzo du règlement."
              : "Le règlement n'a pas été confirmé. Cette tentative n'apparaît pas dans votre portefeuille."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 rounded-lg border bg-muted/40 p-4 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Émission</span>
              <span className="font-medium text-right">{label}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Montant réglé</span>
              <span className="font-semibold text-primary">
                {formatAmount(String(amount), subscription.currency)}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Statut</span>
              <span className="font-medium">
                {paid ? "Paiement confirmé" : "Non abouti"}
              </span>
            </div>
            {subscription.paymentRef && (
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Réf. banque</span>
                <span className="font-mono text-xs">
                  {subscription.paymentRef}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {paid ? (
              <Button className="flex-1" render={<Link href="/portfolio" />}>
                Voir mon portefeuille
              </Button>
            ) : (
              <Button className="flex-1" render={<Link href="/products" />}>
                Réessayer une souscription
              </Button>
            )}
            {paid ? (
              <Button
                variant="outline"
                className="flex-1"
                render={<Link href="/products" />}
              >
                Autres émissions
              </Button>
            ) : (
              <Button
                variant="outline"
                className="flex-1"
                render={<Link href="/dashboard" />}
              >
                Tableau de bord
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
