import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  ensureActiveConvention,
  getUserActiveAgreement,
  listPartnerBanksForApi,
  previewConventionForBank,
} from "@/modules/convention/convention.service";
import { getPartnerBankByCode } from "@/modules/convention/partner-banks";

export const runtime = "nodejs";

/** GET — texte de la convention active + statut de signature de l'utilisateur. */
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  await ensureActiveConvention();
  const { convention, agreement } = await getUserActiveAgreement(
    session.user.id,
  );

  const banks = listPartnerBanksForApi();
  const bankCode = req.nextUrl.searchParams.get("bank");
  const selectedBank = bankCode ? getPartnerBankByCode(bankCode) : null;
  const preview =
    selectedBank && selectedBank.available
      ? previewConventionForBank(selectedBank.name)
      : agreement
        ? previewConventionForBank(agreement.partnerBankName)
        : {
            title: convention.title,
            version: convention.version,
            partnerBankName: convention.partnerBankName,
            bodyMarkdown: convention.bodyMarkdown,
          };

  const kyc = await prisma.kYC.findUnique({
    where: { userId: session.user.id },
    select: { firstName: true, lastName: true, postName: true, status: true },
  });

  const suggestedName = [kyc?.firstName, kyc?.postName, kyc?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return NextResponse.json({
    convention: {
      id: convention.id,
      version: preview.version,
      title: preview.title,
      partnerBankName: preview.partnerBankName,
      bodyMarkdown: preview.bodyMarkdown,
      effectiveFrom: convention.effectiveFrom,
    },
    banks,
    signed: Boolean(agreement),
    agreement: agreement
      ? {
          id: agreement.id,
          signedName: agreement.signedName,
          signedAt: agreement.signedAt,
          pdfSha256: agreement.pdfSha256,
          signatureHash: agreement.signatureHash,
          partnerBankCode: agreement.partnerBankCode,
          partnerBankName: agreement.partnerBankName,
        }
      : null,
    kycStatus: kyc?.status ?? "PENDING",
    suggestedName: suggestedName || session.user.name || "",
  });
}
