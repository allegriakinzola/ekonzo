/**
 * @deprecated Utiliser EasyPayProvider via getPaymentProvider().
 * Conservé pour compatibilité — délègue au provider actif.
 */
import { EasyPayProvider } from "./providers/easypay.provider";
import type { InitMomoPaymentParams, EasyPayInitResponse, EasyPayStatusResponse } from "./easypay.types";
import { normalizeMomoPhone } from "./phone";

export { buildOrderRef } from "./payment.provider";
export { normalizeMomoPhone };

const provider = new EasyPayProvider();

export async function initMomoPayment(
  params: InitMomoPaymentParams,
): Promise<EasyPayInitResponse> {
  const result = await provider.initMomoPayment(params);
  if (result.success && result.providerRef) {
    return { code: 1, reference: result.providerRef };
  }
  return { code: 0, message: result.message ?? "Erreur EasyPay" };
}

export async function checkPaymentStatus(
  reference: string,
): Promise<EasyPayStatusResponse> {
  const result = await provider.checkStatus(reference);
  const status =
    result.status === "SUCCESS"
      ? "SUCCESS"
      : result.status === "CANCELLED"
        ? "CANCELED"
        : result.status === "FAILED"
          ? "DECLINED"
          : "CANCELED";

  return {
    transaction: {
      order_ref: result.orderRef,
      reference: result.providerRef,
    },
    payment: {
      channel: "MOBILE MONEY",
      status: status as "SUCCESS" | "CANCELED" | "DECLINED",
      reference: result.providerRef,
    },
  };
}
