import { Suspense } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPaymentSessionByRawToken } from "@/modules/banks/bank-payment.service";
import { IdpPayForm } from "./IdpPayForm";

export default async function IdpPayPage({
  params,
  searchParams,
}: {
  params: Promise<{ bankCode: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { bankCode } = await params;
  const { token } = await searchParams;

  const bank = await prisma.partnerBank.findFirst({
    where: { code: bankCode.toUpperCase(), isActive: true },
  });
  if (!bank) notFound();

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <p className="text-sm text-muted-foreground">
          Session de paiement manquante.
        </p>
      </div>
    );
  }

  const session = await getPaymentSessionByRawToken(token);
  if (!session || session.partnerBankId !== bank.id) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <p className="text-sm text-destructive">
          Session de paiement invalide ou expirée.
        </p>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          Chargement…
        </div>
      }
    >
      <IdpPayForm
        bankCode={bank.code}
        bankName={bank.name}
        shortName={bank.shortName}
        logoUrl={bank.logoUrl}
        token={token}
        amount={Number(session.amount)}
        currency={session.currency}
        productLabel={session.productLabel}
        instrumentKind={session.instrumentKind}
        accountNumber={session.accountNumber}
        accountName={session.accountName}
        alreadyPaid={session.status === "PAID"}
        returnUrl={session.returnUrl}
        initialMomoPhone={session.momoPhone}
      />
    </Suspense>
  );
}
