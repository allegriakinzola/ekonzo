import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { SubscriptionsManager } from "./SubscriptionsManager";

export default async function AdminSubscriptionsPage() {
  await requireRole(["ADMIN", "SUPER_ADMIN"]);

  const subs = await prisma.subscription.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          phoneNumber: true,
          bankLink: {
            select: {
              accountNumber: true,
              partnerBank: { select: { shortName: true, logoUrl: true } },
            },
          },
        },
      },
      product: {
        select: {
          code: true,
          type: true,
          currency: true,
          instrumentType: true,
          isin: true,
          lineLabel: true,
          announcedRate: true,
          discountRate: true,
          couponRate: true,
          maturityDate: true,
        },
      },
      bankAccount: { select: { bankName: true, accountNumber: true } },
      paymentSession: {
        select: {
          status: true,
          method: true,
          momoPhone: true,
          notifyRef: true,
          paidAt: true,
          accountNumber: true,
          partnerBank: {
            select: { name: true, shortName: true, logoUrl: true },
          },
        },
      },
    },
  });

  const serialized = subs.map((s) => ({
    id: s.id,
    amount: s.amount.toString(),
    settlementAmount: s.settlementAmount?.toString() ?? null,
    currency: s.currency,
    units: s.units,
    paymentChannel: s.paymentChannel,
    paymentRef: s.paymentRef,
    status: s.status,
    adjudicatedAmount: s.adjudicatedAmount?.toString() ?? null,
    adjudicatedRate: s.adjudicatedRate?.toString() ?? null,
    adjudicatedAt: s.adjudicatedAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
    user: {
      name: s.user.name,
      email: s.user.email,
      phoneNumber: s.user.phoneNumber,
      linkedBank: s.user.bankLink
        ? {
            shortName: s.user.bankLink.partnerBank.shortName,
            logoUrl: s.user.bankLink.partnerBank.logoUrl,
            accountNumber: s.user.bankLink.accountNumber,
          }
        : null,
    },
    product: {
      code: s.product.code,
      type: s.product.type,
      currency: s.product.currency,
      instrumentType: s.product.instrumentType,
      isin: s.product.isin,
      lineLabel: s.product.lineLabel,
      announcedRate:
        (
          s.product.announcedRate ??
          s.product.discountRate ??
          s.product.couponRate
        )?.toString() ?? null,
      maturityDate: s.product.maturityDate.toISOString(),
    },
    bankAccount: s.bankAccount,
    paymentSession: s.paymentSession
      ? {
          status: s.paymentSession.status,
          method: s.paymentSession.method,
          momoPhone: s.paymentSession.momoPhone,
          notifyRef: s.paymentSession.notifyRef,
          paidAt: s.paymentSession.paidAt?.toISOString() ?? null,
          accountNumber: s.paymentSession.accountNumber,
          bank: {
            name: s.paymentSession.partnerBank.name,
            shortName: s.paymentSession.partnerBank.shortName,
            logoUrl: s.paymentSession.partnerBank.logoUrl,
          },
        }
      : null,
  }));

  return <SubscriptionsManager initial={serialized} />;
}
