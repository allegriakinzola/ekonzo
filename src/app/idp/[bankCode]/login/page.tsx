import { Suspense } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { IdpLoginForm } from "./IdpLoginForm";

export default async function IdpLoginPage({
  params,
}: {
  params: Promise<{ bankCode: string }>;
}) {
  const { bankCode } = await params;
  const bank = await prisma.partnerBank.findFirst({
    where: { code: bankCode.toUpperCase(), isActive: true },
  });
  if (!bank) notFound();

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          Chargement…
        </div>
      }
    >
      <IdpLoginForm
        bankCode={bank.code}
        bankName={bank.name}
        shortName={bank.shortName}
        logoUrl={bank.logoUrl}
      />
    </Suspense>
  );
}
