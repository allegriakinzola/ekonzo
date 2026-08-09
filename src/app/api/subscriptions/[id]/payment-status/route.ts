import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPaymentProvider } from "@/modules/payments/payment.service";
import { applyPaymentResult } from "@/modules/payments/payment.confirm";

/**
 * GET /api/subscriptions/[id]/payment-status
 * Polling de secours quand l’IPN EasyPay n’arrive pas (ex. localhost).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const subscription = await prisma.subscription.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!subscription) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  if (subscription.status === "PAYMENT_CONFIRMED") {
    return NextResponse.json({
      status: "SUCCESS",
      subscriptionStatus: subscription.status,
    });
  }

  if (
    subscription.status === "CANCELLED" ||
    subscription.status === "FAILED"
  ) {
    return NextResponse.json({
      status: subscription.status === "CANCELLED" ? "CANCELLED" : "FAILED",
      subscriptionStatus: subscription.status,
    });
  }

  if (!subscription.paymentRef) {
    return NextResponse.json({
      status: "PENDING",
      subscriptionStatus: subscription.status,
      message: "Aucun paiement EasyPay initié",
    });
  }

  const checked = await getPaymentProvider().checkStatus(
    subscription.paymentRef,
  );

  if (checked.status === "PENDING") {
    return NextResponse.json({
      status: "PENDING",
      subscriptionStatus: subscription.status,
      providerRef: subscription.paymentRef,
    });
  }

  const applied = await applyPaymentResult({
    providerRef: subscription.paymentRef,
    orderRef: checked.orderRef || undefined,
    status: checked.status,
    // Déjà vérifié via checkStatus ci-dessus
    verifyWithProvider: false,
    rawPayload: checked,
  });

  return NextResponse.json({
    status: applied.status ?? checked.status,
    subscriptionStatus:
      applied.status === "SUCCESS"
        ? "PAYMENT_CONFIRMED"
        : applied.status === "CANCELLED"
          ? "CANCELLED"
          : applied.status === "FAILED"
            ? "FAILED"
            : subscription.status,
    providerRef: subscription.paymentRef,
  });
}
