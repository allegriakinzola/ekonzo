import { NextRequest, NextResponse } from "next/server";
import { getPaymentProvider } from "@/modules/payments/payment.service";
import { applyPaymentResult } from "@/modules/payments/payment.confirm";

/**
 * POST /api/payments/ipn
 * IPN EasyPay — configurez cette URL dans l’espace marchand EasyPay
 * (et EASYPAY_CALLBACK_URL). En local, utiliser un tunnel (ngrok) car
 * EasyPay ne peut pas joindre localhost.
 *
 * Corps attendu :
 * {
 *   transaction: { order_ref, reference },
 *   payment: { channel, status: SUCCESS|CANCELED|DECLINED, reference }
 * }
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  console.log("[EasyPay IPN] Reçu:", JSON.stringify(body));

  const provider = getPaymentProvider();
  const payload = provider.parseIpn(body);

  if (!payload) {
    // Répondre 200 pour éviter les retries infinis sur payload inconnu,
    // mais journaliser.
    console.warn("[EasyPay IPN] Payload non reconnu");
    return NextResponse.json({ received: true, ignored: true });
  }

  const result = await applyPaymentResult({
    providerRef: payload.providerRef,
    orderRef: payload.orderRef,
    status: payload.status,
    verifyWithProvider: true,
    rawPayload: body,
  });

  if (!result.ok && result.message?.includes("introuvable")) {
    // 200 pour stopper les retries EasyPay ; l’anomalie est loguée.
    return NextResponse.json({ received: true, matched: false });
  }

  return NextResponse.json({
    received: true,
    status: result.status,
    alreadyProcessed: result.alreadyProcessed ?? false,
  });
}
