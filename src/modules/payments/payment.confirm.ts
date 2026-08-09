import { prisma } from "@/lib/prisma";
import type { PaymentStatus } from "./payment.types";
import { getPaymentProvider } from "./payment.service";

export type ApplyPaymentResult = {
  ok: boolean;
  alreadyProcessed?: boolean;
  subscriptionId?: string;
  status?: PaymentStatus;
  message?: string;
};

/**
 * Applique un résultat de paiement (IPN ou polling) de façon idempotente.
 * En cas de SUCCESS, vérifie d'abord le statut auprès d'EasyPay (défense anti-faux IPN).
 */
export async function applyPaymentResult(opts: {
  providerRef: string;
  orderRef?: string;
  status: PaymentStatus;
  verifyWithProvider?: boolean;
  rawPayload?: unknown;
}): Promise<ApplyPaymentResult> {
  const { providerRef, orderRef, verifyWithProvider = true, rawPayload } = opts;
  let status = opts.status;

  if (!providerRef) {
    return { ok: false, message: "Référence paiement manquante" };
  }

  if (verifyWithProvider && status === "SUCCESS") {
    try {
      const verified = await getPaymentProvider().checkStatus(providerRef);
      if (verified.status !== "SUCCESS") {
        status = verified.status;
        if (status === "PENDING") {
          return {
            ok: true,
            status: "PENDING",
            message: "Paiement encore en attente côté EasyPay",
          };
        }
      }
    } catch (err) {
      console.error("[Payment] Vérification EasyPay échouée:", err);
      return { ok: false, message: "Impossible de vérifier le statut EasyPay" };
    }
  }

  const transaction = await prisma.transaction.findFirst({
    where: {
      OR: [
        { externalRef: providerRef },
        ...(orderRef ? [{ reference: orderRef }] : []),
      ],
    },
  });

  const sub =
    (transaction?.subscriptionId
      ? await prisma.subscription.findUnique({
          where: { id: transaction.subscriptionId },
        })
      : null) ??
    (await prisma.subscription.findFirst({
      where: { paymentRef: providerRef },
    }));

  if (!sub && !transaction) {
    console.warn(
      `[Payment] Introuvable providerRef=${providerRef} orderRef=${orderRef ?? "-"}`,
    );
    return { ok: false, message: "Souscription / transaction introuvable" };
  }

  if (
    transaction &&
    (transaction.status === "COMPLETED" || transaction.status === "FAILED")
  ) {
    return {
      ok: true,
      alreadyProcessed: true,
      subscriptionId: transaction.subscriptionId ?? sub?.id,
      status: transaction.status === "COMPLETED" ? "SUCCESS" : "FAILED",
    };
  }

  if (
    sub &&
    (sub.status === "PAYMENT_CONFIRMED" ||
      sub.status === "CANCELLED" ||
      sub.status === "FAILED")
  ) {
    return {
      ok: true,
      alreadyProcessed: true,
      subscriptionId: sub.id,
      status:
        sub.status === "PAYMENT_CONFIRMED"
          ? "SUCCESS"
          : sub.status === "CANCELLED"
            ? "CANCELLED"
            : "FAILED",
    };
  }

  if (status === "PENDING") {
    return { ok: true, status: "PENDING", subscriptionId: sub?.id };
  }

  if (status === "SUCCESS") {
    await prisma.$transaction(async (tx) => {
      if (transaction) {
        await tx.transaction.update({
          where: { id: transaction.id },
          data: {
            status: "COMPLETED",
            metadata: (rawPayload as object) ?? undefined,
          },
        });
      }

      if (sub) {
        await tx.subscription.update({
          where: { id: sub.id },
          data: { status: "PAYMENT_CONFIRMED" },
        });

        await tx.auditLog.create({
          data: {
            userId: sub.userId,
            action: "PAYMENT_CONFIRMED",
            entityType: "Subscription",
            entityId: sub.id,
            after: (rawPayload as object) ?? {
              providerRef,
              orderRef,
              status,
            },
          },
        });
      }
    });

    return { ok: true, subscriptionId: sub?.id, status: "SUCCESS" };
  }

  const subStatus = status === "CANCELLED" ? "CANCELLED" : "FAILED";

  await prisma.$transaction(async (tx) => {
    if (transaction) {
      await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          status: "FAILED",
          failureReason: status,
          metadata: (rawPayload as object) ?? undefined,
        },
      });
    }

    if (sub) {
      await tx.subscription.update({
        where: { id: sub.id },
        data: { status: subStatus },
      });

      await tx.auditLog.create({
        data: {
          userId: sub.userId,
          action: `PAYMENT_${status}`,
          entityType: "Subscription",
          entityId: sub.id,
          after: (rawPayload as object) ?? { providerRef, status },
        },
      });
    }
  });

  return { ok: true, subscriptionId: sub?.id, status };
}

/** Crée (ou récupère) le wallet + la Transaction PENDING liée à la souscription. */
export async function createPendingPaymentTransaction(opts: {
  userId: string;
  subscriptionId: string;
  amount: number;
  currency: "CDF" | "USD";
  orderRef: string;
  providerRef: string;
  paymentChannel: "MOBILE_MONEY" | "BANK_TRANSFER";
}) {
  const wallet = await prisma.wallet.upsert({
    where: {
      userId_currency: {
        userId: opts.userId,
        currency: opts.currency,
      },
    },
    update: {},
    create: {
      userId: opts.userId,
      currency: opts.currency,
      balance: 0,
    },
  });

  return prisma.transaction.create({
    data: {
      userId: opts.userId,
      walletId: wallet.id,
      subscriptionId: opts.subscriptionId,
      type: "SUBSCRIPTION",
      amount: opts.amount,
      currency: opts.currency,
      paymentChannel: opts.paymentChannel,
      reference: opts.orderRef,
      externalRef: opts.providerRef,
      status: "PENDING",
      metadata: {
        orderRef: opts.orderRef,
        providerRef: opts.providerRef,
      },
    },
  });
}
