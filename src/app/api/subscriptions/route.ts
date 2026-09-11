import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getActiveBankLink } from "@/modules/banks/bank-link.service";
import { startBankPayment } from "@/modules/banks/bank-payment.service";
import {
  faceValueFromInstrument,
  resolveInstrument,
} from "@/modules/products/product.model";
import { computeSettlement } from "@/modules/products/pricing";

const bodySchema = z.object({
  productId: z.string().min(1),
  /** Nombre de titres (minimum 10) */
  units: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = bodySchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json(
      { error: "Données invalides", details: body.error.flatten() },
      { status: 400 },
    );
  }
  const { productId, units } = body.data;

  const bankLink = await getActiveBankLink(session.user.id);
  if (!bankLink) {
    return NextResponse.json(
      {
        error:
          "Aucune banque liée. Liez votre banque partenaire dans Paramètres avant de souscrire.",
        code: "BANK_LINK_REQUIRED",
      },
      { status: 409 },
    );
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.status !== "OPEN") {
    return NextResponse.json({ error: "Émission indisponible" }, { status: 404 });
  }
  if (product.subscriptionDeadline.getTime() < Date.now()) {
    return NextResponse.json(
      { error: "La période de soumission est clôturée" },
      { status: 400 },
    );
  }

  const instrument = resolveInstrument({
    instrumentType: product.instrumentType,
    type: product.type,
    currency: product.currency,
  });
  const faceValue = Number(product.faceValue) || faceValueFromInstrument(instrument);
  const minUnits = Math.max(1, Math.round(Number(product.minTicket) / faceValue));
  if (units < minUnits) {
    return NextResponse.json(
      { error: `Minimum ${minUnits} titres (${product.minTicket} ${product.currency})` },
      { status: 400 },
    );
  }

  const nominal = units * faceValue;

  const committed = await prisma.subscription.aggregate({
    where: { productId, status: { notIn: ["CANCELLED", "FAILED"] } },
    _sum: { amount: true },
  });
  const volumeLeft =
    Number(product.totalVolume) - Number(committed._sum.amount ?? 0);
  if (nominal > volumeLeft) {
    return NextResponse.json(
      {
        error: `Montant trop élevé. Il reste ${volumeLeft.toLocaleString("fr-CD")} ${product.currency} sur cette émission.`,
      },
      { status: 400 },
    );
  }

  const annualRate = Number(
    product.announcedRate ?? product.discountRate ?? product.couponRate ?? 0,
  );
  const settlement = computeSettlement({
    instrument,
    units,
    faceValue,
    annualRate,
    issuanceDate: product.issuanceDate,
    maturityDate: product.maturityDate,
    interestPeriodsPerYear: product.interestPeriodsPerYear,
    principalRepaymentMode: product.principalRepaymentMode,
  });

  const bankAccount = await prisma.bankAccount.upsert({
    where: {
      userId_accountNumber_currency: {
        userId: session.user.id,
        accountNumber: bankLink.accountNumber,
        currency: bankLink.currency,
      },
    },
    update: { bankName: bankLink.partnerBank.name, isVerified: true },
    create: {
      userId: session.user.id,
      bankName: bankLink.partnerBank.name,
      accountNumber: bankLink.accountNumber,
      accountName: bankLink.accountName,
      currency: bankLink.currency,
      channel: "SIMAD",
      isVerified: true,
      isDefault: true,
    },
  });

  const subscription = await prisma.subscription.create({
    data: {
      userId: session.user.id,
      productId,
      amount: nominal,
      settlementAmount: settlement.payable,
      currency: product.currency,
      units,
      paymentChannel: "BANK_TRANSFER",
      bankAccountId: bankAccount.id,
      status: "PENDING_PAYMENT",
    },
  });

  try {
    const payment = await startBankPayment({
      subscriptionId: subscription.id,
      userId: session.user.id,
      partnerBankId: bankLink.partnerBank.id,
      accountNumber: bankLink.accountNumber,
      accountName: bankLink.accountName,
    });

    return NextResponse.json(
      {
        id: subscription.id,
        status: subscription.status,
        units,
        nominal,
        settlementAmount: settlement.payable,
        currency: product.currency,
        redirectUrl: payment.redirectUrl,
        bank: payment.bank,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("[subscriptions] startBankPayment failed:", err);
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: "FAILED" },
    });
    const message =
      err instanceof Error
        ? err.message
        : "Impossible d'ouvrir la session de paiement banque";
    return NextResponse.json(
      {
        error: message,
        subscriptionId: subscription.id,
      },
      { status: 502 },
    );
  }
}
