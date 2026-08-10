import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getPaymentProvider } from "@/modules/payments/payment.service";
import { buildOrderRef } from "@/modules/payments/payment.provider";
import {
  createPendingPaymentTransaction,
} from "@/modules/payments/payment.confirm";
import {
  inferMomoOperator,
  isValidMomoPhone,
  normalizeMomoPhone,
} from "@/modules/payments/phone";
import { hasSignedActiveConvention } from "@/modules/convention/convention.service";
import { getSettlementProfile } from "@/modules/settlement/settlement.service";

const bodySchema = z.object({
  productId: z.string().min(1),
  amount: z.number().positive(),
  paymentChannel: z.enum(["MOBILE_MONEY", "BANK_TRANSFER"]),
  momoPhone: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  bankTransferRef: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  if (!(await hasSignedActiveConvention(session.user.id))) {
    return NextResponse.json(
      { error: "Convention de compte-titres non signée" },
      { status: 403 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { kycStatus: true, phoneNumber: true },
  });
  if (user?.kycStatus !== "VERIFIED") {
    return NextResponse.json({ error: "KYC non vérifié" }, { status: 403 });
  }

  const body = bodySchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "Données invalides", details: body.error.flatten() }, { status: 400 });
  }

  const {
    productId,
    amount,
    paymentChannel,
    momoPhone: momoPhoneInput,
    bankName: bankNameInput,
    bankAccount: bankAccountInput,
    bankTransferRef,
  } = body.data;

  const settlement = await getSettlementProfile(session.user.id);
  const bankName = bankNameInput || settlement.bankName || undefined;
  const bankAccount =
    bankAccountInput || settlement.bankAccountNumber || undefined;

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.status !== "OPEN") {
    return NextResponse.json({ error: "Produit indisponible" }, { status: 404 });
  }
  if (amount < Number(product.minTicket)) {
    return NextResponse.json({
      error: `Le montant minimum est ${product.minTicket} ${product.currency}`,
    }, { status: 400 });
  }

  const committed = await prisma.subscription.aggregate({
    where: {
      productId,
      status: { notIn: ["CANCELLED", "FAILED"] },
    },
    _sum: { amount: true },
  });
  const volumeLeft =
    Number(product.totalVolume) - Number(committed._sum.amount ?? 0);
  if (amount > volumeLeft) {
    return NextResponse.json(
      {
        error: `Montant trop élevé. Il reste ${volumeLeft.toLocaleString("fr-CD")} ${product.currency} disponibles sur cette émission.`,
      },
      { status: 400 },
    );
  }

  const units = 1;
  let momoAccountId: string | undefined;
  let bankAccountId: string | undefined;
  let momoPhone: string | undefined;

  if (paymentChannel === "MOBILE_MONEY") {
    const rawPhone =
      momoPhoneInput ||
      settlement.momoPhone ||
      user?.phoneNumber ||
      null;
    if (!rawPhone) {
      return NextResponse.json(
        {
          error:
            "Aucun numéro Mobile Money. Configurez votre profil de règlement.",
        },
        { status: 400 },
      );
    }
    momoPhone = normalizeMomoPhone(rawPhone);
    if (!isValidMomoPhone(momoPhone)) {
      return NextResponse.json(
        {
          error:
            "Le numéro Mobile Money est invalide (format attendu : 9 chiffres, ex. 812345678).",
        },
        { status: 400 },
      );
    }
    const momoOperator = inferMomoOperator(momoPhone);
    const momo = await prisma.momoAccount.upsert({
      where: {
        userId_operator_phoneNumber: {
          userId: session.user.id,
          operator: momoOperator,
          phoneNumber: momoPhone,
        },
      },
      update: {},
      create: {
        userId: session.user.id,
        operator: momoOperator,
        phoneNumber: momoPhone,
        accountName: session.user.name ?? "",
      },
    });
    momoAccountId = momo.id;
  }

  if (paymentChannel === "BANK_TRANSFER") {
    if (!bankName || !bankAccount) {
      return NextResponse.json({ error: "Banque et numéro de compte requis" }, { status: 400 });
    }
    const bank = await prisma.bankAccount.upsert({
      where: {
        userId_accountNumber_currency: {
          userId: session.user.id,
          accountNumber: bankAccount,
          currency: product.currency,
        },
      },
      update: {},
      create: {
        userId: session.user.id,
        bankName,
        accountNumber: bankAccount,
        accountName: session.user.name ?? "",
        currency: product.currency,
        channel: "SIMAD",
      },
    });
    bankAccountId = bank.id;
  }

  const subscription = await prisma.subscription.create({
    data: {
      userId: session.user.id,
      productId,
      amount,
      currency: product.currency,
      units,
      paymentChannel,
      momoAccountId,
      bankAccountId,
      bankTransferRef: bankTransferRef || null,
      status: "PENDING_PAYMENT",
    },
    include: { user: { select: { name: true, email: true } } },
  });

  if (paymentChannel === "MOBILE_MONEY") {
    const provider = getPaymentProvider();
    const orderRef = buildOrderRef(subscription.id);
    const result = await provider.initMomoPayment({
      orderRef,
      amount: Number(amount),
      currency: product.currency as "CDF" | "USD",
      description: `Souscription ${product.code} — ${amount} ${product.currency}`,
      customerName: subscription.user.name || "Client ekonzo",
      customerPhone: momoPhone!,
      customerEmail: subscription.user.email ?? undefined,
    });

    if (!result.success || !result.providerRef) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: "FAILED" },
      });
      return NextResponse.json(
        {
          error:
            result.message ??
            "Impossible d'envoyer le prompt USSD. Vérifiez vos clés EasyPay et réessayez.",
          subscriptionId: subscription.id,
          momoPromptSent: false,
        },
        { status: 502 },
      );
    }

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { paymentRef: result.providerRef },
    });

    await createPendingPaymentTransaction({
      userId: session.user.id,
      subscriptionId: subscription.id,
      amount: Number(amount),
      currency: product.currency as "CDF" | "USD",
      orderRef,
      providerRef: result.providerRef,
      paymentChannel: "MOBILE_MONEY",
    });

    return NextResponse.json(
      {
        id: subscription.id,
        status: "PENDING_PAYMENT",
        paymentRef: result.providerRef,
        orderRef,
        momoPromptSent: true,
        momoPhone,
        amount,
        currency: product.currency,
      },
      { status: 201 },
    );
  }

  return NextResponse.json(subscription, { status: 201 });
}
