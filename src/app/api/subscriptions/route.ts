import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getPaymentProvider } from "@/modules/payments/payment.service";
import { buildOrderRef } from "@/modules/payments/payment.provider";

const bodySchema = z.object({
  productId: z.string().min(1),
  amount: z.number().positive(),
  paymentChannel: z.enum(["MOBILE_MONEY", "BANK_TRANSFER"]),
  momoOperator: z.enum(["AIRTEL", "ORANGE", "MPESA"]).optional(),
  momoPhone: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  bankTransferRef: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { kycStatus: true },
  });
  if (user?.kycStatus !== "VERIFIED") {
    return NextResponse.json({ error: "KYC non vérifié" }, { status: 403 });
  }

  const body = bodySchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "Données invalides", details: body.error.flatten() }, { status: 400 });
  }

  const { productId, amount, paymentChannel, momoOperator, momoPhone, bankName, bankAccount, bankTransferRef } = body.data;

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.status !== "OPEN") {
    return NextResponse.json({ error: "Produit indisponible" }, { status: 404 });
  }
  if (amount < Number(product.minTicket)) {
    return NextResponse.json({
      error: `Le montant minimum est ${product.minTicket} ${product.currency}`,
    }, { status: 400 });
  }

  const volumeLeft = Number(product.totalVolume) - Number(product.allocatedVolume);
  if (amount > volumeLeft) {
    return NextResponse.json({ error: "Volume insuffisant sur ce produit" }, { status: 400 });
  }

  const units = Math.floor(amount / Number(product.faceValue));
  if (units < 1) {
    return NextResponse.json({ error: "Montant insuffisant pour acquérir au moins un titre" }, { status: 400 });
  }

  let momoAccountId: string | undefined;
  let bankAccountId: string | undefined;

  if (paymentChannel === "MOBILE_MONEY") {
    if (!momoOperator || !momoPhone) {
      return NextResponse.json({ error: "Opérateur et numéro MoMo requis" }, { status: 400 });
    }
    const momo = await prisma.momoAccount.upsert({
      where: { userId_operator_phoneNumber: { userId: session.user.id, operator: momoOperator, phoneNumber: momoPhone } },
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
      where: { userId_accountNumber_currency: { userId: session.user.id, accountNumber: bankAccount, currency: product.currency } },
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
    try {
      const provider = getPaymentProvider();
      const orderRef = buildOrderRef(subscription.id);
      const result = await provider.initMomoPayment({
        orderRef,
        amount: Number(amount),
        currency: product.currency as "CDF" | "USD",
        description: `Souscription ${product.code} — ${units} titre(s)`,
        customerName: subscription.user.name ?? "",
        customerPhone: momoPhone!,
        customerEmail: subscription.user.email ?? undefined,
      });

      if (result.success && result.providerRef) {
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { paymentRef: result.providerRef },
        });
        return NextResponse.json(
          { ...subscription, paymentRef: result.providerRef, momoPromptSent: true },
          { status: 201 }
        );
      } else {
        return NextResponse.json(
          { ...subscription, momoPromptSent: false, momoError: result.message },
          { status: 201 }
        );
      }
    } catch {
      return NextResponse.json({ ...subscription, momoPromptSent: false }, { status: 201 });
    }
  }

  return NextResponse.json(subscription, { status: 201 });
}
