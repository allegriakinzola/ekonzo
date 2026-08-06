import type {
  EasyPayInitResponse,
  EasyPayStatusResponse,
  InitMomoPaymentParams,
} from "./easypay.types";

const EASYPAY_MODE = process.env.EASYPAY_MODE ?? "sandbox";
const EASYPAY_CID = process.env.EASYPAY_CID ?? "";
const EASYPAY_TOKEN = process.env.EASYPAY_TOKEN ?? "";

const EASYPAY_BASE = `https://www.e-com-easypay.com/${EASYPAY_MODE}`;

function authQuery(): string {
  const params = new URLSearchParams({
    cid: EASYPAY_CID,
    token: EASYPAY_TOKEN,
  });
  return params.toString();
}

/**
 * Génère un order_ref conforme EasyPay : 6 à 16 caractères alphanumériques,
 * unique par transaction. Préfixe "EK" + fragment de l'id de souscription.
 */
export function buildOrderRef(subscriptionId: string): string {
  const fragment = subscriptionId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
  return `EK${fragment}`.slice(0, 16).toUpperCase();
}

/**
 * API 4 — paiement Mobile Money sans redirection.
 * EasyPay envoie un prompt USSD sur le téléphone du client.
 */
export async function initMomoPayment(
  params: InitMomoPaymentParams
): Promise<EasyPayInitResponse> {
  const res = await fetch(`${EASYPAY_BASE}/mobile-money/payment?${authQuery()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      order_ref: params.orderRef,
      amount: params.amount,
      currency: params.currency,
      description: params.description,
      customer_name: params.customerName,
      customer_phone: params.customerPhone,
      customer_email: params.customerEmail ?? "",
    }),
  });

  return (await res.json()) as EasyPayInitResponse;
}

/**
 * API 3 — vérifier le statut d'une transaction (backup si l'IPN n'arrive pas).
 */
export async function checkPaymentStatus(
  reference: string
): Promise<EasyPayStatusResponse> {
  const res = await fetch(
    `${EASYPAY_BASE}/payment/${reference}/checking-status?${authQuery()}`,
    { method: "GET" }
  );

  return (await res.json()) as EasyPayStatusResponse;
}
