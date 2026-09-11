import { NextRequest, NextResponse } from "next/server";
import { getPaymentProvider } from "@/modules/payments/payment.service";
import { applyPaymentResult } from "@/modules/payments/payment.confirm";
import {
  applyMomoResultToSession,
  findMomoSessionByRefs,
} from "@/modules/banks/bank-payment.service";

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

  // Paiement Mobile Money initié côté banque partenaire (interop) ?
  const bankSession = await findMomoSessionByRefs(
    payload.orderRef,
    payload.providerRef,
  );
  if (bankSession) {
    let status = payload.status;
    if (status === "SUCCESS") {
      try {
        const verified = await provider.checkStatus(
          payload.providerRef || bankSession.momoProviderRef || "",
        );
        if (verified.status !== "SUCCESS") status = verified.status;
      } catch (err) {
        console.error("[EasyPay IPN] Vérification banque échouée:", err);
      }
    }
    const applied = await applyMomoResultToSession(
      bankSession,
      status,
      payload.providerRef,
    );
    return NextResponse.json({
      received: true,
      scope: "bank_interop",
      status: applied.status,
    });
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
