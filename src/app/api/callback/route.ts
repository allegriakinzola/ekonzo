import { NextRequest, NextResponse } from "next/server";
import { getPaymentProvider } from "@/modules/payments/payment.service";
import { applyPaymentResult } from "@/modules/payments/payment.confirm";

/**
 * Alias historique de l’IPN EasyPay.
 * Préférer /api/payments/ipn — les deux partagent la même logique.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  console.log("[EasyPay callback] Reçu:", JSON.stringify(body));

  const payload = getPaymentProvider().parseIpn(body);
  if (!payload) {
    console.warn("[EasyPay callback] Payload non reconnu");
    return NextResponse.json({ received: true, ignored: true });
  }

  const result = await applyPaymentResult({
    providerRef: payload.providerRef,
    orderRef: payload.orderRef,
    status: payload.status,
    verifyWithProvider: true,
    rawPayload: body,
  });

  return NextResponse.json({
    received: true,
    status: result.status,
    alreadyProcessed: result.alreadyProcessed ?? false,
  });
}
