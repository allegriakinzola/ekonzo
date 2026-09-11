import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import type {
  BankPaymentSession,
  Currency,
  InstrumentType,
  PaymentChannel,
} from "@prisma/client";
import {
  INSTRUMENT_LABELS,
  isBond,
  resolveInstrument,
} from "@/modules/products/product.model";
import { ensureBankOAuthCredentials } from "@/modules/banks/bank-link.service";
import { getPaymentProvider } from "@/modules/payments/payment.service";
import {
  isValidMomoPhone,
  MOMO_PHONE_ERROR,
  normalizeMomoPhone,
} from "@/modules/payments/phone";
import type { PaymentStatus } from "@/modules/payments/payment.types";

const PAY_TTL_MS = 1000 * 60 * 30;

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

function hashToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

export function instrumentKindLabel(instrument: InstrumentType) {
  return isBond(instrument) ? "bon du Trésor" : "obligation du Trésor";
}

export function formatPayAmount(amount: number, currency: Currency) {
  return `${Math.round(amount).toLocaleString("fr-CD")} ${currency}`;
}

/**
 * Crée une session de paiement banque pour une souscription PENDING_PAYMENT
 * et renvoie l'URL de redirection vers l'UI banque (simulée ou externe).
 */
export async function startBankPayment(input: {
  subscriptionId: string;
  userId: string;
  partnerBankId: string;
  accountNumber: string;
  accountName: string;
}) {
  const subscription = await prisma.subscription.findFirst({
    where: {
      id: input.subscriptionId,
      userId: input.userId,
      status: "PENDING_PAYMENT",
    },
    include: {
      product: true,
    },
  });
  if (!subscription) {
    throw new Error("Souscription introuvable ou déjà traitée");
  }

  let bank = await prisma.partnerBank.findFirst({
    where: { id: input.partnerBankId, isActive: true },
  });
  if (!bank) throw new Error("Banque partenaire introuvable");
  bank = await ensureBankOAuthCredentials(bank.id);

  if (
    typeof (prisma as { bankPaymentSession?: unknown }).bankPaymentSession ===
    "undefined"
  ) {
    throw new Error(
      "Client Prisma obsolète (bankPaymentSession manquant). Redémarrez le serveur Next.js.",
    );
  }

  const instrument = resolveInstrument({
    instrumentType: subscription.product.instrumentType,
    type: subscription.product.type,
    currency: subscription.product.currency,
  });
  const productLabel =
    subscription.product.lineLabel ??
    subscription.product.isin ??
    subscription.product.code;
  const amount = Number(
    subscription.settlementAmount ?? subscription.amount,
  );
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const returnUrl = `${appUrl()}/products/payment-return?subscriptionId=${subscription.id}`;

  const existing = await prisma.bankPaymentSession.findUnique({
    where: { subscriptionId: subscription.id },
  });
  if (existing?.status === "PAID") {
    throw new Error("Cette souscription est déjà payée");
  }

  const session = existing
    ? await prisma.bankPaymentSession.update({
        where: { id: existing.id },
        data: {
          partnerBankId: bank.id,
          token: tokenHash,
          amount,
          currency: subscription.currency,
          productLabel,
          instrumentKind: instrumentKindLabel(instrument),
          accountNumber: input.accountNumber,
          accountName: input.accountName,
          status: "PENDING",
          notifyRef: null,
          paidAt: null,
          returnUrl,
          expiresAt: new Date(Date.now() + PAY_TTL_MS),
        },
      })
    : await prisma.bankPaymentSession.create({
        data: {
          partnerBankId: bank.id,
          userId: input.userId,
          subscriptionId: subscription.id,
          token: tokenHash,
          amount,
          currency: subscription.currency,
          productLabel,
          instrumentKind: instrumentKindLabel(instrument),
          accountNumber: input.accountNumber,
          accountName: input.accountName,
          returnUrl,
          expiresAt: new Date(Date.now() + PAY_TTL_MS),
        },
      });

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { paymentRef: `bankpay_${session.id}` },
  });

  // Mode simulé : UI IdP hébergée sur ekonzo
  // Mode externe : URL banque (fallback simulé si absente)
  const redirectUrl =
    bank.interopMode === "EXTERNAL" && bank.authorizeUrl
      ? (() => {
          const u = new URL(
            bank.authorizeUrl!.replace(/\/oauth\/authorize\/?$/, "/payments/pay"),
          );
          u.searchParams.set("token", rawToken);
          u.searchParams.set("client_id", bank.oauthClientId!);
          return u.toString();
        })()
      : `${appUrl()}/idp/${bank.code}/pay?token=${rawToken}`;

  return {
    sessionId: session.id,
    redirectUrl,
    amount,
    currency: subscription.currency,
    productLabel,
    instrumentLabel: INSTRUMENT_LABELS[instrument],
    bank: {
      id: bank.id,
      code: bank.code,
      shortName: bank.shortName,
      name: bank.name,
    },
  };
}

export async function getPaymentSessionByRawToken(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  return prisma.bankPaymentSession.findFirst({
    where: { token: tokenHash },
    include: {
      partnerBank: {
        select: {
          id: true,
          code: true,
          name: true,
          shortName: true,
          logoUrl: true,
          oauthClientId: true,
          oauthClientSecret: true,
        },
      },
      subscription: {
        include: {
          product: {
            select: {
              code: true,
              lineLabel: true,
              isin: true,
              instrumentType: true,
              type: true,
              currency: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Notification banque → ekonzo : confirme le paiement (idempotent).
 * Authentifiée par client_id / client_secret OAuth de la banque.
 */
export async function notifyBankPayment(input: {
  bankCode: string;
  clientId: string;
  clientSecret: string;
  token: string;
  notifyRef?: string;
  /** Moyen utilisé côté banque (défaut : compte bancaire) */
  channel?: PaymentChannel;
  channelRef?: string;
}) {
  const bank = await prisma.partnerBank.findFirst({
    where: { code: input.bankCode.toUpperCase(), isActive: true },
  });
  if (!bank) {
    return { ok: false as const, status: 404, error: "Banque introuvable" };
  }
  const ensured = await ensureBankOAuthCredentials(bank.id);
  if (
    input.clientId !== ensured.oauthClientId ||
    input.clientSecret !== ensured.oauthClientSecret
  ) {
    return { ok: false as const, status: 401, error: "Identifiants OAuth invalides" };
  }

  const session = await getPaymentSessionByRawToken(input.token);
  if (!session || session.partnerBankId !== bank.id) {
    return { ok: false as const, status: 404, error: "Session de paiement introuvable" };
  }
  if (session.expiresAt.getTime() < Date.now() && session.status === "PENDING") {
    await prisma.bankPaymentSession.update({
      where: { id: session.id },
      data: { status: "EXPIRED" },
    });
    return { ok: false as const, status: 410, error: "Session de paiement expirée" };
  }

  if (session.status === "PAID") {
    return {
      ok: true as const,
      alreadyProcessed: true,
      subscriptionId: session.subscriptionId,
      returnUrl: session.returnUrl,
      status: "PAID" as const,
    };
  }
  if (session.status !== "PENDING") {
    return {
      ok: false as const,
      status: 409,
      error: `Session en statut ${session.status}`,
    };
  }

  const notifyRef =
    input.notifyRef ?? `BP-${Date.now().toString(36).toUpperCase()}`;
  const channel: PaymentChannel = input.channel ?? "BANK_TRANSFER";

  await prisma.$transaction(async (tx) => {
    await tx.bankPaymentSession.update({
      where: { id: session.id },
      data: {
        status: "PAID",
        paidAt: new Date(),
        notifyRef,
        method: channel === "MOBILE_MONEY" ? "MOBILE_MONEY" : "BANK_ACCOUNT",
        ...(channel === "MOBILE_MONEY" ? { momoStatus: "SUCCESS" } : {}),
      },
    });

    await tx.subscription.update({
      where: { id: session.subscriptionId },
      data: {
        status: "PAYMENT_CONFIRMED",
        paymentChannel: channel,
        paymentRef: notifyRef,
        bankTransferRef: notifyRef,
      },
    });

    const wallet = await tx.wallet.upsert({
      where: {
        userId_currency: {
          userId: session.userId,
          currency: session.currency,
        },
      },
      update: {},
      create: {
        userId: session.userId,
        currency: session.currency,
        balance: 0,
      },
    });

    await tx.transaction.create({
      data: {
        userId: session.userId,
        walletId: wallet.id,
        subscriptionId: session.subscriptionId,
        type: "SUBSCRIPTION",
        amount: session.amount,
        currency: session.currency,
        paymentChannel: channel,
        reference: notifyRef,
        externalRef: input.channelRef ?? notifyRef,
        status: "COMPLETED",
        metadata: {
          source: "bank_interop",
          bankCode: bank.code,
          paymentSessionId: session.id,
          productLabel: session.productLabel,
          method: channel,
          ...(channel === "MOBILE_MONEY"
            ? {
                momoPhone: session.momoPhone,
                momoOrderRef: session.momoOrderRef,
                momoProviderRef: session.momoProviderRef,
              }
            : {}),
        },
      },
    });

    await tx.notification.create({
      data: {
        userId: session.userId,
        type: "PAYMENT_CONFIRMED",
        title: "Paiement confirmé",
        body: `Votre banque ${bank.shortName} a confirmé le paiement de ${formatPayAmount(Number(session.amount), session.currency)} pour ${session.productLabel}${channel === "MOBILE_MONEY" ? " (Mobile Money)" : ""}.`,
        data: {
          subscriptionId: session.subscriptionId,
          notifyRef,
        },
      },
    });

    await tx.auditLog.create({
      data: {
        userId: session.userId,
        action: "BANK_PAYMENT_CONFIRMED",
        entityType: "Subscription",
        entityId: session.subscriptionId,
        after: {
          notifyRef,
          bankCode: bank.code,
          amount: Number(session.amount),
          currency: session.currency,
          channel,
        },
      },
    });
  });

  return {
    ok: true as const,
    alreadyProcessed: false,
    subscriptionId: session.subscriptionId,
    returnUrl: session.returnUrl,
    status: "PAID" as const,
    notifyRef,
  };
}

/**
 * Confirmation depuis l'UI banque simulée : notifie ekonzo avec les credentials OAuth.
 */
export async function confirmSimulatedBankPayment(
  rawToken: string,
  opts?: { channel?: PaymentChannel; channelRef?: string },
) {
  const session = await getPaymentSessionByRawToken(rawToken);
  if (!session) {
    return { ok: false as const, status: 404, error: "Session introuvable" };
  }
  const bank = await ensureBankOAuthCredentials(session.partnerBankId);
  if (!bank.oauthClientId || !bank.oauthClientSecret) {
    return { ok: false as const, status: 500, error: "Credentials banque manquants" };
  }

  return notifyBankPayment({
    bankCode: bank.code,
    clientId: bank.oauthClientId,
    clientSecret: bank.oauthClientSecret,
    token: rawToken,
    channel: opts?.channel,
    channelRef: opts?.channelRef,
  });
}

// ══════════════════════════════════════════════════════════════════════════
// MOBILE MONEY côté banque (simulation — agrégateur EasyPay)
// ══════════════════════════════════════════════════════════════════════════

/** order_ref EasyPay : 6–16 alphanumériques, préfixe BP + fragment id session */
function buildBankMomoOrderRef(sessionId: string) {
  const fragment = sessionId.replace(/[^a-zA-Z0-9]/g, "").slice(-12);
  return `BP${fragment}`.slice(0, 16).toUpperCase();
}

export type MomoPollStatus = "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED";

/**
 * Étape 1 — la banque déclenche le prompt USSD via son agrégateur.
 */
export async function startMomoPaymentForSession(input: {
  rawToken: string;
  phone: string;
}) {
  const session = await getPaymentSessionByRawToken(input.rawToken);
  if (!session) {
    return { ok: false as const, status: 404, error: "Session introuvable" };
  }
  if (session.status === "PAID") {
    return {
      ok: false as const,
      status: 409,
      error: "Cette souscription est déjà payée",
    };
  }
  if (session.status !== "PENDING" || session.expiresAt.getTime() < Date.now()) {
    return { ok: false as const, status: 410, error: "Session expirée" };
  }

  const phone = normalizeMomoPhone(input.phone);
  if (!isValidMomoPhone(phone)) {
    return { ok: false as const, status: 400, error: MOMO_PHONE_ERROR };
  }

  const orderRef = buildBankMomoOrderRef(session.id);
  const provider = getPaymentProvider();
  const result = await provider.initMomoPayment({
    orderRef,
    amount: Number(session.amount),
    currency: session.currency as "CDF" | "USD",
    description: `${session.partnerBank.shortName} — ${session.productLabel} — ekonzo`,
    customerName: session.accountName || "Client",
    customerPhone: phone,
  });

  if (!result.success || !result.providerRef) {
    await prisma.bankPaymentSession.update({
      where: { id: session.id },
      data: {
        method: "MOBILE_MONEY",
        momoPhone: phone,
        momoOrderRef: orderRef,
        momoStatus: "INIT_FAILED",
        failureReason: result.message ?? "Échec d'initialisation",
      },
    });
    return {
      ok: false as const,
      status: 502,
      error:
        result.message ??
        "L'agrégateur Mobile Money n'a pas pu envoyer la demande de paiement.",
    };
  }

  await prisma.bankPaymentSession.update({
    where: { id: session.id },
    data: {
      method: "MOBILE_MONEY",
      momoPhone: phone,
      momoOrderRef: orderRef,
      momoProviderRef: result.providerRef,
      momoStatus: "PENDING",
      failureReason: null,
    },
  });

  return {
    ok: true as const,
    phone,
    orderRef,
    providerRef: result.providerRef,
  };
}

/**
 * Applique un résultat agrégateur à une session (IPN ou polling).
 * SUCCESS → notifie ekonzo (interop). Échec → session reste PENDING pour réessai.
 */
export async function applyMomoResultToSession(
  session: BankPaymentSession,
  status: PaymentStatus,
  providerRef?: string,
): Promise<{ status: MomoPollStatus; returnUrl?: string; error?: string }> {
  if (session.status === "PAID") {
    return { status: "SUCCESS", returnUrl: session.returnUrl };
  }
  if (status === "PENDING") return { status: "PENDING" };

  if (status === "SUCCESS") {
    const bank = await ensureBankOAuthCredentials(session.partnerBankId);
    // On retrouve le jeton brut impossible (hashé) → on notifie via l'ID de session
    const result = await notifyBankPaymentBySessionId({
      sessionId: session.id,
      bankId: bank.id,
      clientId: bank.oauthClientId!,
      clientSecret: bank.oauthClientSecret!,
      channelRef: providerRef ?? session.momoProviderRef ?? undefined,
    });
    if (!result.ok) {
      return { status: "FAILED", error: result.error };
    }
    return { status: "SUCCESS", returnUrl: result.returnUrl };
  }

  const momoStatus = status === "CANCELLED" ? "CANCELLED" : "FAILED";
  await prisma.bankPaymentSession.update({
    where: { id: session.id },
    data: {
      momoStatus,
      failureReason:
        momoStatus === "CANCELLED"
          ? "Paiement annulé sur le téléphone"
          : "Paiement refusé par l'opérateur",
    },
  });
  return {
    status: momoStatus,
    error:
      momoStatus === "CANCELLED"
        ? "Paiement annulé sur le menu USSD."
        : "Paiement Mobile Money non abouti. Réessayez ou payez par compte bancaire.",
  };
}

/**
 * Variante interne de notifyBankPayment quand on ne dispose que de l'ID
 * de session (IPN agrégateur). Même logique, même garanties.
 */
async function notifyBankPaymentBySessionId(input: {
  sessionId: string;
  bankId: string;
  clientId: string;
  clientSecret: string;
  channelRef?: string;
}) {
  const session = await prisma.bankPaymentSession.findUnique({
    where: { id: input.sessionId },
    include: { partnerBank: true },
  });
  if (!session || session.partnerBankId !== input.bankId) {
    return { ok: false as const, status: 404, error: "Session introuvable" };
  }
  if (
    input.clientId !== session.partnerBank.oauthClientId ||
    input.clientSecret !== session.partnerBank.oauthClientSecret
  ) {
    return { ok: false as const, status: 401, error: "Identifiants OAuth invalides" };
  }
  if (session.status === "PAID") {
    return {
      ok: true as const,
      alreadyProcessed: true,
      subscriptionId: session.subscriptionId,
      returnUrl: session.returnUrl,
      status: "PAID" as const,
    };
  }
  if (session.status !== "PENDING") {
    return { ok: false as const, status: 409, error: `Session ${session.status}` };
  }

  // Émission d'un jeton éphémère pour réutiliser notifyBankPayment (source unique)
  const rawToken = randomBytes(32).toString("hex");
  await prisma.bankPaymentSession.update({
    where: { id: session.id },
    data: { token: hashToken(rawToken) },
  });

  return notifyBankPayment({
    bankCode: session.partnerBank.code,
    clientId: input.clientId,
    clientSecret: input.clientSecret,
    token: rawToken,
    channel: "MOBILE_MONEY",
    channelRef: input.channelRef,
  });
}

/**
 * Étape 2 — polling depuis l'UI banque : interroge l'agrégateur.
 */
export async function pollMomoPaymentForSession(rawToken: string) {
  const session = await getPaymentSessionByRawToken(rawToken);
  if (!session) {
    return { ok: false as const, status: 404, error: "Session introuvable" };
  }
  if (session.status === "PAID") {
    return { ok: true as const, status: "SUCCESS" as MomoPollStatus, returnUrl: session.returnUrl };
  }
  if (!session.momoProviderRef) {
    return { ok: false as const, status: 400, error: "Aucun paiement Mobile Money initié" };
  }
  if (session.momoStatus === "CANCELLED" || session.momoStatus === "FAILED") {
    return {
      ok: true as const,
      status: session.momoStatus as MomoPollStatus,
      error: session.failureReason ?? undefined,
    };
  }

  let checked: PaymentStatus = "PENDING";
  try {
    const res = await getPaymentProvider().checkStatus(session.momoProviderRef);
    checked = res.status;
  } catch (err) {
    console.error("[BankPay MoMo] checkStatus error:", err);
  }

  const applied = await applyMomoResultToSession(session, checked, session.momoProviderRef);
  return { ok: true as const, ...applied };
}

/** IPN agrégateur → retrouve la session par order_ref / reference. */
export async function findMomoSessionByRefs(orderRef?: string, providerRef?: string) {
  if (!orderRef && !providerRef) return null;
  return prisma.bankPaymentSession.findFirst({
    where: {
      OR: [
        ...(orderRef ? [{ momoOrderRef: orderRef }] : []),
        ...(providerRef ? [{ momoProviderRef: providerRef }] : []),
      ],
    },
  });
}
