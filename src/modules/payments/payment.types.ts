export type PaymentCurrency = "CDF" | "USD";

export type PaymentStatus = "SUCCESS" | "PENDING" | "CANCELLED" | "FAILED";

export interface InitPaymentParams {
  orderRef: string;
  amount: number;
  currency: PaymentCurrency;
  description: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
}

export interface InitPaymentResult {
  success: boolean;
  providerRef?: string;
  message?: string;
}

export interface PaymentStatusResult {
  status: PaymentStatus;
  providerRef: string;
  orderRef: string;
}

export interface IpnPayload {
  orderRef: string;
  providerRef: string;
  status: PaymentStatus;
  channel: string;
}
