import type { IPaymentProvider } from "../payment.provider";
import type {
  InitPaymentParams,
  InitPaymentResult,
  IpnPayload,
  PaymentStatus,
  PaymentStatusResult,
} from "../payment.types";

const MODE = process.env.EASYPAY_MODE ?? "sandbox";
const CID = process.env.EASYPAY_CID ?? "";
const TOKEN = process.env.EASYPAY_TOKEN ?? "";
const BASE = `https://www.e-com-easypay.com/${MODE}`;
const CALLBACK_URL = process.env.EASYPAY_CALLBACK_URL ?? "";

function authQuery(): string {
  return new URLSearchParams({ cid: CID, token: TOKEN }).toString();
}

const STATUS_MAP: Record<string, PaymentStatus> = {
  SUCCESS:  "SUCCESS",
  CANCELED: "CANCELLED",
  DECLINED: "FAILED",
};

export class EasyPayProvider implements IPaymentProvider {
  async initMomoPayment(params: InitPaymentParams): Promise<InitPaymentResult> {
    try {
      const res = await fetch(`${BASE}/mobile-money/payment?${authQuery()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_ref:      params.orderRef,
          amount:         params.amount,
          currency:       params.currency,
          description:    params.description,
          customer_name:  params.customerName,
          customer_phone: params.customerPhone,
          customer_email: params.customerEmail ?? "",
          ...(CALLBACK_URL ? { callback_url: CALLBACK_URL } : {}),
        }),
      });

      const json = (await res.json()) as { code: 0 | 1; reference?: string; message?: string };

      if (json.code === 1 && json.reference) {
        return { success: true, providerRef: json.reference };
      }
      return { success: false, message: json.message ?? "Erreur EasyPay" };
    } catch (err) {
      return { success: false, message: String(err) };
    }
  }

  async checkStatus(providerRef: string): Promise<PaymentStatusResult> {
    const res = await fetch(
      `${BASE}/payment/${providerRef}/checking-status?${authQuery()}`
    );
    const json = (await res.json()) as {
      transaction: { order_ref: string; reference: string };
      payment: { status: string; reference: string; channel: string };
    };
    return {
      status:     STATUS_MAP[json.payment?.status] ?? "PENDING",
      providerRef: json.payment?.reference ?? providerRef,
      orderRef:   json.transaction?.order_ref ?? "",
    };
  }

  parseIpn(body: unknown): IpnPayload | null {
    if (!body || typeof body !== "object") return null;
    const b = body as Record<string, unknown>;
    const tx = b.transaction as Record<string, string> | undefined;
    const pay = b.payment as Record<string, string> | undefined;
    if (!tx?.order_ref || !pay?.status) return null;
    return {
      orderRef:    tx.order_ref,
      providerRef: pay.reference ?? tx.reference ?? "",
      status:      STATUS_MAP[pay.status] ?? "PENDING",
      channel:     pay.channel ?? "MOBILE MONEY",
    };
  }
}
