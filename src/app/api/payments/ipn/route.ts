import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPaymentProvider } from "@/modules/payments/payment.service";

/**
 * POST /api/payments/ipn
 * Webhook générique — reçoit les notifications de paiement du provider actif.
 * EasyPay envoie un POST avec le statut de la transaction quand l'utilisateur
 * confirme ou annule le paiement USSD.
 *
 * Configurer dans EasyPay : https://votre-domaine.com/api/payments/ipn
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const provider = getPaymentProvider();
  const payload = provider.parseIpn(body);

  if (!payload) {
    return NextResponse.json({ error: "Payload IPN non reconnu" }, { status: 400 });
  }

  const subscription = await prisma.subscription.findFirst({
    where: { paymentRef: payload.providerRef },
  });

  if (!subscription) {
    return NextResponse.json({ error: "Souscription introuvable" }, { status: 404 });
  }

  if (payload.status === "SUCCESS") {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: "PAYMENT_CONFIRMED" },
    });
  } else if (payload.status === "CANCELLED" || payload.status === "FAILED") {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: "CANCELLED" },
    });
  }

  return NextResponse.json({ received: true });
}
