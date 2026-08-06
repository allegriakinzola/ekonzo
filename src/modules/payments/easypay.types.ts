export type EasyPayCurrency = "CDF" | "USD";

export type EasyPayChannel = "CREDIT CARD" | "MOBILE MONEY";

export type EasyPayPaymentStatus = "SUCCESS" | "CANCELED" | "DECLINED";

/** Réponse d'initialisation / de paiement MoMo. */
export interface EasyPayInitResponse {
  code: 0 | 1;
  reference?: string;
  message?: string;
}

/** Réponse de vérification de statut (endpoint checking-status). */
export interface EasyPayStatusResponse {
  transaction: {
    order_ref: string;
    reference: string;
  };
  payment: {
    channel: string;
    status: EasyPayPaymentStatus;
    reference: string;
  };
}

/** Payload reçu sur le callback IPN. */
export interface EasyPayIpnPayload {
  transaction: {
    order_ref: string;
    reference: string;
  };
  payment: {
    channel: string;
    status: EasyPayPaymentStatus;
    reference: string;
  };
}

export interface InitMomoPaymentParams {
  orderRef: string;
  amount: number;
  currency: EasyPayCurrency;
  description: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
}
