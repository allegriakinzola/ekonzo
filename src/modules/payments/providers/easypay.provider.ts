import type { IPaymentProvider } from "../payment.provider";
import type {
  InitPaymentParams,
  InitPaymentResult,
  IpnPayload,
  PaymentStatus,
  PaymentStatusResult,
} from "../payment.types";
import { normalizeMomoPhone } from "../phone";

const MODE = process.env.EASYPAY_MODE ?? "sandbox";
const CID = process.env.EASYPAY_CID ?? "";
const TOKEN = process.env.EASYPAY_TOKEN ?? "";
const BASE = `https://www.e-com-easypay.com/${MODE}`;

function authQuery(): string {
  return new URLSearchParams({ cid: CID, token: TOKEN }).toString();
}

function assertConfig() {
  if (!CID || !TOKEN) {
    throw new Error("EASYPAY_CID / EASYPAY_TOKEN manquants dans .env");
  }
}

const STATUS_MAP: Record<string, PaymentStatus> = {
  SUCCESS: "SUCCESS",
  CANCELED: "CANCELLED",
  CANCELLED: "CANCELLED",
  DECLINED: "FAILED",
};

export class EasyPayProvider implements IPaymentProvider {
  /**
   * API 4 — paiement Mobile Money sans redirection.
   * EasyPay envoie le prompt USSD sur le téléphone du client.
   * POST /{MODE}/mobile-money/payment?cid=&token=
   */
  async initMomoPayment(params: InitPaymentParams): Promise<InitPaymentResult> {
    try {
      assertConfig();

      const customerPhone = normalizeMomoPhone(params.customerPhone);
      if (!customerPhone || customerPhone.length < 8) {
        return {
          success: false,
          message:
            "Numéro Mobile Money invalide. Utilisez le format 8XXXXXXXX (sans 0 ni +243).",
        };
      }

      const body = {
        order_ref: params.orderRef,
        amount: params.amount,
        currency: params.currency,
        description: params.description,
        customer_name: params.customerName,
        customer_phone: customerPhone,
        customer_email: params.customerEmail ?? "",
      };

      const res = await fetch(`${BASE}/mobile-money/payment?${authQuery()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const text = await res.text();
      let json: { code?: 0 | 1; reference?: string; message?: string };
      try {
        json = JSON.parse(text) as typeof json;
      } catch {
        console.error("[EasyPay] Réponse non-JSON:", res.status, text.slice(0, 500));
        return {
          success: false,
          message: `EasyPay a renvoyé une réponse invalide (HTTP ${res.status}).`,
        };
      }

      if (json.code === 1 && json.reference) {
        return { success: true, providerRef: json.reference };
      }

      console.error("[EasyPay] Init MoMo échouée:", json);
      return {
        success: false,
        message: json.message ?? `Échec EasyPay (code=${json.code ?? "?"})`,
      };
    } catch (err) {
      console.error("[EasyPay] Init MoMo exception:", err);
      return { success: false, message: String(err) };
    }
  }

  /**
   * API 3 — vérifier le statut d'une transaction.
   * POST /{MODE}/payment/{reference}/checking-payment
   */
  async checkStatus(providerRef: string): Promise<PaymentStatusResult> {
    assertConfig();

    const res = await fetch(
      `${BASE}/payment/${encodeURIComponent(providerRef)}/checking-payment`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
    );

    if (res.status === 404) {
      return { status: "PENDING", providerRef, orderRef: "" };
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[EasyPay] checkStatus HTTP", res.status, text.slice(0, 300));
      return { status: "PENDING", providerRef, orderRef: "" };
    }

    const json = (await res.json()) as {
      transaction?: { order_ref?: string; reference?: string };
      payment?: { status?: string; reference?: string; channel?: string };
      message?: string;
    };

    return {
      status: STATUS_MAP[json.payment?.status ?? ""] ?? "PENDING",
      providerRef: json.payment?.reference ?? json.transaction?.reference ?? providerRef,
      orderRef: json.transaction?.order_ref ?? "",
    };
  }

  parseIpn(body: unknown): IpnPayload | null {
    if (!body || typeof body !== "object") return null;
    const b = body as Record<string, unknown>;
    const tx = b.transaction as Record<string, string> | undefined;
    const pay = b.payment as Record<string, string> | undefined;
    if (!tx?.order_ref || !pay?.status) return null;
    return {
      orderRef: tx.order_ref,
      providerRef: pay.reference ?? tx.reference ?? "",
      status: STATUS_MAP[pay.status] ?? "PENDING",
      channel: pay.channel ?? "MOBILE MONEY",
    };
  }
}
