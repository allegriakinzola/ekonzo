import type { IPaymentProvider } from "./payment.provider";
import { EasyPayProvider } from "./providers/easypay.provider";

/**
 * Retourne le provider actif selon la variable PAYMENT_PROVIDER.
 * Pour brancher un autre provider :
 *   1. Créer src/modules/payments/providers/monprovider.provider.ts
 *   2. Implémenter IPaymentProvider
 *   3. Ajouter le cas dans ce switch
 *   4. Mettre PAYMENT_PROVIDER=monprovider dans .env
 */
export function getPaymentProvider(): IPaymentProvider {
  const provider = process.env.PAYMENT_PROVIDER ?? "easypay";

  switch (provider) {
    case "easypay":
      return new EasyPayProvider();
    default:
      throw new Error(`Provider de paiement inconnu : "${provider}"`);
  }
}
