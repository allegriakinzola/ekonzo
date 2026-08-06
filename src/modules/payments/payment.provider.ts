import type {
  InitPaymentParams,
  InitPaymentResult,
  PaymentStatusResult,
  IpnPayload,
} from "./payment.types";

export interface IPaymentProvider {
  /**
   * Déclenche un paiement Mobile Money (prompt USSD envoyé au client).
   */
  initMomoPayment(params: InitPaymentParams): Promise<InitPaymentResult>;

  /**
   * Vérifie le statut d'une transaction existante (backup IPN).
   */
  checkStatus(providerRef: string): Promise<PaymentStatusResult>;

  /**
   * Parse et normalise le payload brut reçu sur le webhook IPN.
   * Retourne null si le payload est invalide ou non reconnu.
   */
  parseIpn(body: unknown): IpnPayload | null;
}

/**
 * Génère un order_ref unique : 6–16 caractères alphanumériques.
 * Préfixe "EK" + fragment de l'id de souscription.
 */
export function buildOrderRef(subscriptionId: string): string {
  const fragment = subscriptionId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
  return `EK${fragment}`.slice(0, 16).toUpperCase();
}
