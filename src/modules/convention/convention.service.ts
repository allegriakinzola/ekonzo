import { createHash } from "crypto";
import { mkdir, writeFile } from "fs/promises";
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

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "conventions");

export type SignatureMethod = "TYPED" | "DRAWN";

const TEMPLATE_BANK_LABEL = "la banque partenaire choisie";

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

  const userDir = path.join(UPLOAD_DIR, opts.userId);
  await mkdir(userDir, { recursive: true });
  const stamp = signedAt.toISOString().replace(/[:.]/g, "-");
  const fileName = `convention-${convention.version}-${stamp}.pdf`;
  const absolutePath = path.join(userDir, fileName);
  await writeFile(absolutePath, buffer);
  const pdfPath = path.join(opts.userId, fileName).replace(/\\/g, "/");

  let signatureImagePath: string | undefined;
  if (signatureImage) {
    const imgName = `signature-${convention.version}-${stamp}.png`;
    await writeFile(path.join(userDir, imgName), signatureImage);
    signatureImagePath = path.join(opts.userId, imgName).replace(/\\/g, "/");
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
      pdfPath,
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

export function getConventionUploadDir() {
  return UPLOAD_DIR;
}
