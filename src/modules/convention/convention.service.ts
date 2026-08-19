import { createHash } from "crypto";
import { mkdir, writeFile, readFile } from "fs/promises";
import os from "os";
import path from "path";
import { prisma } from "@/lib/prisma";
import {
  CONVENTION_TITLE,
  CONVENTION_VERSION,
  buildConventionBody,
} from "./convention.text";
import { buildSignatureHash, generateConventionPdf } from "./convention.pdf";
import {
  getAvailablePartnerBanks,
  getPartnerBankByCode,
} from "./partner-banks";

export type SignatureMethod = "TYPED" | "DRAWN";

const TEMPLATE_BANK_LABEL = "la banque partenaire choisie";

/**
 * Sur Vercel le FS de l'app est en lecture seule → /tmp.
 * En local : uploads/conventions.
 */
export function getConventionUploadDir() {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join(/*turbopackIgnore: true*/ os.tmpdir(), "ekonzo-conventions");
  }
  return path.join(
    /*turbopackIgnore: true*/ process.cwd(),
    "uploads",
    "conventions",
  );
}

/** Garantit qu'une version active de la convention existe en base. */
export async function ensureActiveConvention() {
  const existing = await prisma.securitiesAccountConvention.findUnique({
    where: { version: CONVENTION_VERSION },
  });
  if (existing) {
    if (!existing.isActive) {
      return prisma.securitiesAccountConvention.update({
        where: { id: existing.id },
        data: {
          isActive: true,
          title: CONVENTION_TITLE,
          bodyMarkdown: buildConventionBody(TEMPLATE_BANK_LABEL),
        },
      });
    }
    return existing;
  }

  await prisma.securitiesAccountConvention.updateMany({
    where: { isActive: true },
    data: { isActive: false },
  });

  return prisma.securitiesAccountConvention.create({
    data: {
      version: CONVENTION_VERSION,
      title: CONVENTION_TITLE,
      partnerBankName: TEMPLATE_BANK_LABEL,
      bodyMarkdown: buildConventionBody(TEMPLATE_BANK_LABEL),
      isActive: true,
    },
  });
}

export function previewConventionForBank(partnerBankName: string) {
  return {
    title: CONVENTION_TITLE,
    version: CONVENTION_VERSION,
    partnerBankName,
    bodyMarkdown: buildConventionBody(partnerBankName),
  };
}

export async function getUserActiveAgreement(userId: string) {
  const convention = await ensureActiveConvention();
  const agreement = await prisma.securitiesAccountAgreement.findUnique({
    where: {
      userId_conventionId: {
        userId,
        conventionId: convention.id,
      },
    },
  });
  return { convention, agreement };
}

export async function hasSignedActiveConvention(
  userId: string,
): Promise<boolean> {
  const { agreement } = await getUserActiveAgreement(userId);
  return Boolean(agreement);
}

function parseDataUrlPng(dataUrl: string): Buffer {
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=\s]+)$/.exec(
    dataUrl.trim(),
  );
  if (!match) {
    throw new Error("Image de signature invalide (PNG attendu)");
  }
  const buf = Buffer.from(match[1].replace(/\s/g, ""), "base64");
  if (buf.length < 64 || buf.length > 1_500_000) {
    throw new Error("Taille de signature invalide");
  }
  return buf;
}

/** Lit le PDF signé : base64 DB en priorité, sinon disque. */
export async function readAgreementPdfBuffer(agreement: {
  pdfPath: string;
  pdfBase64?: string | null;
}): Promise<Buffer> {
  if (agreement.pdfBase64) {
    return Buffer.from(agreement.pdfBase64, "base64");
  }
  const uploadDir = getConventionUploadDir();
  const absolute = path.join(uploadDir, agreement.pdfPath);
  if (!absolute.startsWith(uploadDir)) {
    throw new Error("Chemin PDF invalide");
  }
  return readFile(absolute);
}

/** Lit l'image de signature : base64 DB ou disque. */
export async function readAgreementSignatureBuffer(agreement: {
  signatureImagePath?: string | null;
  signatureImageBase64?: string | null;
}): Promise<Buffer | null> {
  if (agreement.signatureImageBase64) {
    return Buffer.from(agreement.signatureImageBase64, "base64");
  }
  if (!agreement.signatureImagePath) return null;
  const uploadDir = getConventionUploadDir();
  const absolute = path.join(uploadDir, agreement.signatureImagePath);
  if (!absolute.startsWith(uploadDir)) {
    throw new Error("Chemin signature invalide");
  }
  return readFile(absolute);
}

export async function signActiveConvention(opts: {
  userId: string;
  signedName: string;
  partnerBankCode: string;
  signatureMethod: SignatureMethod;
  signatureImageDataUrl?: string | null;
  userPhone?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const signedName = opts.signedName.trim();
  if (signedName.length < 3) {
    throw new Error("Le nom signataire est trop court");
  }
  if (
    opts.signatureMethod !== "TYPED" &&
    opts.signatureMethod !== "DRAWN"
  ) {
    throw new Error("Méthode de signature invalide");
  }
  if (opts.signatureMethod === "DRAWN" && !opts.signatureImageDataUrl) {
    throw new Error("La signature manuscrite est requise");
  }

  const bank = getPartnerBankByCode(opts.partnerBankCode);
  if (!bank || !bank.available) {
    throw new Error("Banque partenaire invalide ou indisponible");
  }

  const convention = await ensureActiveConvention();
  const existing = await prisma.securitiesAccountAgreement.findUnique({
    where: {
      userId_conventionId: {
        userId: opts.userId,
        conventionId: convention.id,
      },
    },
  });
  if (existing) {
    return { agreement: existing, alreadySigned: true as const };
  }

  const signedAt = new Date();
  const bodyMarkdown = buildConventionBody(bank.name);
  const signatureImage =
    opts.signatureMethod === "DRAWN" && opts.signatureImageDataUrl
      ? parseDataUrlPng(opts.signatureImageDataUrl)
      : null;
  const signatureImageSha = signatureImage
    ? createHash("sha256").update(signatureImage).digest("hex")
    : null;

  const signatureHash = buildSignatureHash({
    userId: opts.userId,
    conventionVersion: convention.version,
    signedName,
    signedAtIso: signedAt.toISOString(),
    bodyMarkdown,
    signatureImageSha,
  });

  const { buffer, sha256 } = await generateConventionPdf({
    title: convention.title,
    version: convention.version,
    partnerBankName: bank.name,
    bodyMarkdown,
    signedName,
    userId: opts.userId,
    userPhone: opts.userPhone,
    signedAt,
    signatureHash,
    ipAddress: opts.ipAddress,
    signatureImage,
    signatureMethod: opts.signatureMethod,
  });

  const uploadDir = getConventionUploadDir();
  const userDir = path.join(uploadDir, opts.userId);
  await mkdir(userDir, { recursive: true });
  const stamp = signedAt.toISOString().replace(/[:.]/g, "-");
  const fileName = `convention-${convention.version}-${stamp}.pdf`;
  const absolutePath = path.join(userDir, fileName);
  await writeFile(absolutePath, buffer);
  const pdfPath = path.join(opts.userId, fileName).replace(/\\/g, "/");
  const pdfBase64 = buffer.toString("base64");

  let signatureImagePath: string | undefined;
  let signatureImageBase64: string | undefined;
  if (signatureImage) {
    const imgName = `signature-${convention.version}-${stamp}.png`;
    await writeFile(path.join(userDir, imgName), signatureImage);
    signatureImagePath = path.join(opts.userId, imgName).replace(/\\/g, "/");
    signatureImageBase64 = signatureImage.toString("base64");
  }

  const agreement = await prisma.securitiesAccountAgreement.create({
    data: {
      userId: opts.userId,
      conventionId: convention.id,
      partnerBankCode: bank.code,
      partnerBankName: bank.name,
      signedName,
      signatureMethod: opts.signatureMethod,
      signatureHash,
      signatureImagePath,
      signatureImageBase64,
      pdfPath,
      pdfBase64,
      pdfSha256: sha256,
      ipAddress: opts.ipAddress ?? undefined,
      userAgent: opts.userAgent ?? undefined,
      acceptedTerms: true,
      signedAt,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: opts.userId,
      action: "CONVENTION_SIGNED",
      entityType: "SecuritiesAccountAgreement",
      entityId: agreement.id,
      after: {
        conventionVersion: convention.version,
        partnerBankCode: bank.code,
        partnerBankName: bank.name,
        signedName,
        signatureMethod: opts.signatureMethod,
        signatureHash,
        pdfSha256: sha256,
        pdfPath,
        signatureImagePath,
      },
      ipAddress: opts.ipAddress ?? undefined,
      userAgent: opts.userAgent ?? undefined,
    },
  });

  return { agreement, alreadySigned: false as const };
}

export function listPartnerBanksForApi() {
  return getAvailablePartnerBanks().map((b) => ({
    code: b.code,
    name: b.name,
    shortName: b.shortName,
    logoSrc: b.logoSrc,
  }));
}
