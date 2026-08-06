import { prisma } from "@/lib/prisma";
import { ManualKycProvider } from "./providers/manual.provider";
import { AwsKycProvider } from "./providers/aws.provider";
import type { KycProvider, KycSubmission, KycExtractedData } from "./kyc.types";

export function getKycProvider(): KycProvider {
  const provider = process.env.KYC_PROVIDER ?? "manual";
  switch (provider) {
    case "aws":
      return new AwsKycProvider();
    default:
      return new ManualKycProvider();
  }
}

/**
 * Étape 1 — Extraction OCR du document (recto).
 * Retourne les champs pré-remplis que l'utilisateur pourra corriger.
 */
export async function extractDocumentData(docPath: string): Promise<KycExtractedData> {
  const provider = getKycProvider();
  return provider.extractDocument(docPath);
}

/**
 * Étape 2 — Vérification faciale + enregistrement du dossier.
 * Le facteur de validation est la correspondance visage carte ↔ selfie.
 * Si match → KYC VERIFIED automatiquement. Sinon → SUBMITTED (revue admin).
 */
export async function verifyFaceAndSubmit(submission: KycSubmission) {
  const provider = getKycProvider();
  const face = await provider.compareFaces(submission.docFrontPath, submission.selfiePath);

  const status = face.faceMatch ? "VERIFIED" : "SUBMITTED";

  const data = {
    status,
    docType: submission.docType,
    firstName: submission.firstName,
    lastName: submission.lastName,
    postName: submission.postName ?? null,
    dateOfBirth: submission.dateOfBirth ?? null,
    docNumber: submission.docNumber ?? null,
    address: submission.address ?? null,
    docFrontUrl: submission.docFrontPath,
    docBackUrl: null,
    selfieUrl: submission.selfiePath,
    rejectedNote: null,
    verifiedAt: face.faceMatch ? new Date() : null,
  } as const;

  await prisma.kYC.upsert({
    where: { userId: submission.userId },
    create: { userId: submission.userId, ...data },
    update: { ...data },
  });

  await prisma.user.update({
    where: { id: submission.userId },
    data: {
      kycStatus: status,
      name: [submission.firstName, submission.postName, submission.lastName].filter(Boolean).join(" "),
    },
  });

  return {
    approved: face.faceMatch,
    similarity: face.similarity,
    status,
  };
}

export async function approveKyc(kycId: string, adminId: string) {
  const kyc = await prisma.kYC.update({
    where: { id: kycId },
    data: { status: "VERIFIED", verifiedAt: new Date() },
    include: { user: true },
  });
  await prisma.user.update({
    where: { id: kyc.userId },
    data: { kycStatus: "VERIFIED" },
  });
  await prisma.auditLog.create({
    data: {
      userId: adminId,
      action: "KYC_APPROVED",
      entityType: "KYC",
      entityId: kycId,
    },
  });
  return kyc;
}

export async function rejectKyc(kycId: string, adminId: string, reason: string) {
  const kyc = await prisma.kYC.update({
    where: { id: kycId },
    data: { status: "REJECTED", rejectedNote: reason },
    include: { user: true },
  });
  await prisma.user.update({
    where: { id: kyc.userId },
    data: { kycStatus: "REJECTED" },
  });
  await prisma.auditLog.create({
    data: {
      userId: adminId,
      action: "KYC_REJECTED",
      entityType: "KYC",
      entityId: kycId,
    },
  });
  return kyc;
}
