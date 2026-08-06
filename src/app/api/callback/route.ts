import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { EasyPayIpnPayload } from "@/modules/payments/easypay.types";

/**
 * Endpoint IPN (Instant Payment Notification) EasyPay.
 * EasyPay POSTe ici le résultat d'un paiement dès que le client confirme,
 * annule ou que la transaction échoue.
 *
 * Flux :
 *   1. Retrouver la transaction ekonzo via externalRef (= reference EasyPay)
 *   2. Mettre à jour le statut de la transaction et de la souscription
 *   3. Créditer le wallet si SUCCESS
 *
 * NOTE sécurité : EasyPay sandbox ne signe pas les webhooks. En production,
 * on vérifiera systématiquement le statut via checkPaymentStatus() avant de
 * créditer quoi que ce soit (défense contre les faux callbacks).
 */
export async function POST(req: NextRequest) {
  let payload: EasyPayIpnPayload;

  try {
    payload = (await req.json()) as EasyPayIpnPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const easypayRef = payload?.payment?.reference ?? payload?.transaction?.reference;
  const status = payload?.payment?.status;

  if (!easypayRef || !status) {
    return NextResponse.json({ error: "Missing reference or status" }, { status: 400 });
  }

  const transaction = await prisma.transaction.findFirst({
    where: { externalRef: easypayRef },
  });

  if (!transaction) {
    // On répond 200 pour éviter que EasyPay ne réessaie indéfiniment,
    // mais on journalise l'anomalie.
    console.warn(`[EasyPay IPN] Transaction introuvable pour ref=${easypayRef}`);
    return NextResponse.json({ received: true });
  }

  // Idempotence : ne pas retraiter une transaction déjà finalisée.
  if (transaction.status === "COMPLETED" || transaction.status === "FAILED") {
    return NextResponse.json({ received: true, alreadyProcessed: true });
  }

  if (status === "SUCCESS") {
    await prisma.$transaction(async (tx) => {
      await tx.transaction.update({
        where: { id: transaction.id },
        data: { status: "COMPLETED", metadata: payload as object },
      });

      // Créditer le wallet du canal correspondant
      await tx.wallet.update({
        where: {
          userId_currency: {
            userId: transaction.userId,
            currency: transaction.currency,
          },
        },
        data: { balance: { increment: transaction.amount } },
      });

      if (transaction.subscriptionId) {
        await tx.subscription.update({
          where: { id: transaction.subscriptionId },
          data: { status: "PAYMENT_CONFIRMED" },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: transaction.userId,
          action: "PAYMENT_CONFIRMED",
          entityType: "Transaction",
          entityId: transaction.id,
          after: payload as object,
        },
      });
    });
  } else {
    // CANCELED ou DECLINED
    await prisma.$transaction(async (tx) => {
      await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          status: "FAILED",
          failureReason: status,
          metadata: payload as object,
        },
      });

      if (transaction.subscriptionId) {
        await tx.subscription.update({
          where: { id: transaction.subscriptionId },
          data: { status: "FAILED" },
        });
      }
    });
  }

  return NextResponse.json({ received: true });
}
