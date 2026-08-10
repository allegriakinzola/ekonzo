import path from "path";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";

export type CifClient = Awaited<ReturnType<typeof fetchCifClients>>[number];

function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.BETTER_AUTH_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

/** Construit une URL admin vers un fichier KYC (basename du chemin disque). */
export function kycFileApiUrl(
  absOrRelPath: string | null | undefined,
  userId: string,
): string {
  if (!absOrRelPath) return "";
  const filename = absOrRelPath.split(/[\\/]/).pop();
  if (!filename) return "";
  return `${appBaseUrl()}/api/kyc/file/${userId}/${filename}`;
}

export function conventionPdfApiUrl(userId: string): string {
  return `${appBaseUrl()}/api/admin/cif/${userId}/convention`;
}

export function signatureApiUrl(userId: string): string {
  return `${appBaseUrl()}/api/admin/cif/${userId}/signature`;
}

export async function fetchCifClients(userId?: string) {
  return prisma.user.findMany({
    where: {
      role: "CLIENT",
      ...(userId ? { id: userId } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      kyc: true,
      settlementProfile: true,
      momoAccounts: { orderBy: { createdAt: "desc" } },
      bankAccounts: { orderBy: { createdAt: "desc" } },
      securitiesAgreements: {
        include: {
          convention: { select: { version: true, title: true } },
        },
        orderBy: { signedAt: "desc" },
      },
      _count: { select: { subscriptions: true } },
    },
  });
}

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toISOString().slice(0, 19).replace("T", " ");
}

function boolFr(v: boolean | null | undefined): string {
  if (v == null) return "";
  return v ? "Oui" : "Non";
}

/** Une ligne CIF par client (convention = dernière signature). */
export function clientToCifRow(u: CifClient) {
  const kyc = u.kyc;
  const settlement = u.settlementProfile;
  const agreement = u.securitiesAgreements[0] ?? null;
  const defaultMomo =
    u.momoAccounts.find((a) => a.isDefault) ?? u.momoAccounts[0] ?? null;
  const defaultBank =
    u.bankAccounts.find((a) => a.isDefault) ?? u.bankAccounts[0] ?? null;

  return {
    userId: u.id,
    name: u.name,
    phoneNumber: u.phoneNumber ?? "",
    email: u.email ?? "",
    banned: boolFr(u.banned),
    createdAt: fmtDate(u.createdAt),
    subscriptionCount: u._count.subscriptions,

    kycStatus: u.kycStatus,
    kycDocType: kyc?.docType ?? "",
    kycFirstName: kyc?.firstName ?? "",
    kycLastName: kyc?.lastName ?? "",
    kycPostName: kyc?.postName ?? "",
    kycDateOfBirth: kyc?.dateOfBirth ?? "",
    kycDocNumber: kyc?.docNumber ?? "",
    kycAddress: kyc?.address ?? "",
    kycSubmittedAt: fmtDate(kyc?.submittedAt),
    kycVerifiedAt: fmtDate(kyc?.verifiedAt),
    kycRejectedNote: kyc?.rejectedNote ?? "",
    kycDocFrontUrl: kyc
      ? kycFileApiUrl(kyc.docFrontUrl, u.id)
      : "",
    kycSelfieUrl: kyc ? kycFileApiUrl(kyc.selfieUrl, u.id) : "",

    settlementChannel: settlement?.preferredChannel ?? "",
    settlementMomoPhone: settlement?.momoPhone ?? "",
    settlementBankName: settlement?.bankName ?? "",
    settlementBankAccountNumber: settlement?.bankAccountNumber ?? "",
    settlementBankAccountName: settlement?.bankAccountName ?? "",

    momoOperator: defaultMomo?.operator ?? "",
    momoPhone: defaultMomo?.phoneNumber ?? "",
    momoAccountName: defaultMomo?.accountName ?? "",

    bankName: defaultBank?.bankName ?? "",
    bankAccountNumber: defaultBank?.accountNumber ?? "",
    bankAccountName: defaultBank?.accountName ?? "",
    bankCurrency: defaultBank?.currency ?? "",
    bankChannel: defaultBank?.channel ?? "",

    conventionSigned: boolFr(!!agreement),
    conventionVersion: agreement?.convention.version ?? "",
    conventionTitle: agreement?.convention.title ?? "",
    partnerBankCode: agreement?.partnerBankCode ?? "",
    partnerBankName: agreement?.partnerBankName ?? "",
    signedName: agreement?.signedName ?? "",
    signatureMethod: agreement?.signatureMethod ?? "",
    signedAt: fmtDate(agreement?.signedAt),
    signatureHash: agreement?.signatureHash ?? "",
    pdfSha256: agreement?.pdfSha256 ?? "",
    conventionPdfUrl: agreement ? conventionPdfApiUrl(u.id) : "",
    signatureImageUrl: agreement?.signatureImagePath
      ? signatureApiUrl(u.id)
      : agreement?.signatureMethod === "TYPED"
        ? `(signature tapée : ${agreement.signedName})`
        : "",
    agreementIp: agreement?.ipAddress ?? "",
  };
}

const CIF_COLUMNS: { header: string; key: keyof ReturnType<typeof clientToCifRow>; width: number }[] = [
  { header: "ID utilisateur", key: "userId", width: 28 },
  { header: "Nom affiché", key: "name", width: 28 },
  { header: "Téléphone", key: "phoneNumber", width: 16 },
  { header: "Email", key: "email", width: 28 },
  { header: "Banni", key: "banned", width: 10 },
  { header: "Inscrit le", key: "createdAt", width: 20 },
  { header: "Nb souscriptions", key: "subscriptionCount", width: 14 },

  { header: "KYC — Statut", key: "kycStatus", width: 14 },
  { header: "KYC — Type doc", key: "kycDocType", width: 12 },
  { header: "KYC — Prénom", key: "kycFirstName", width: 16 },
  { header: "KYC — Nom", key: "kycLastName", width: 16 },
  { header: "KYC — Post-nom", key: "kycPostName", width: 16 },
  { header: "KYC — Date naissance", key: "kycDateOfBirth", width: 14 },
  { header: "KYC — N° document", key: "kycDocNumber", width: 16 },
  { header: "KYC — Adresse", key: "kycAddress", width: 32 },
  { header: "KYC — Soumis le", key: "kycSubmittedAt", width: 20 },
  { header: "KYC — Vérifié le", key: "kycVerifiedAt", width: 20 },
  { header: "KYC — Motif rejet", key: "kycRejectedNote", width: 24 },
  { header: "KYC — URL recto", key: "kycDocFrontUrl", width: 40 },
  { header: "KYC — URL selfie", key: "kycSelfieUrl", width: 40 },

  { header: "Règlement — Canal", key: "settlementChannel", width: 16 },
  { header: "Règlement — MoMo", key: "settlementMomoPhone", width: 16 },
  { header: "Règlement — Banque", key: "settlementBankName", width: 20 },
  { header: "Règlement — N° compte", key: "settlementBankAccountNumber", width: 18 },
  { header: "Règlement — Titulaire", key: "settlementBankAccountName", width: 22 },

  { header: "MoMo — Opérateur", key: "momoOperator", width: 12 },
  { header: "MoMo — Téléphone", key: "momoPhone", width: 16 },
  { header: "MoMo — Nom compte", key: "momoAccountName", width: 20 },

  { header: "Banque — Nom", key: "bankName", width: 18 },
  { header: "Banque — N° compte", key: "bankAccountNumber", width: 18 },
  { header: "Banque — Titulaire", key: "bankAccountName", width: 20 },
  { header: "Banque — Devise", key: "bankCurrency", width: 10 },
  { header: "Banque — Canal", key: "bankChannel", width: 10 },

  { header: "Convention — Signée", key: "conventionSigned", width: 12 },
  { header: "Convention — Version", key: "conventionVersion", width: 12 },
  { header: "Convention — Titre", key: "conventionTitle", width: 36 },
  { header: "Banque partenaire — Code", key: "partnerBankCode", width: 16 },
  { header: "Banque partenaire — Nom", key: "partnerBankName", width: 22 },
  { header: "Signataire", key: "signedName", width: 24 },
  { header: "Méthode signature", key: "signatureMethod", width: 14 },
  { header: "Signé le", key: "signedAt", width: 20 },
  { header: "Hash signature", key: "signatureHash", width: 40 },
  { header: "SHA-256 PDF", key: "pdfSha256", width: 40 },
  { header: "URL PDF convention", key: "conventionPdfUrl", width: 44 },
  { header: "URL / détail signature", key: "signatureImageUrl", width: 44 },
  { header: "IP signature", key: "agreementIp", width: 16 },
];

export async function buildCifWorkbook(userId?: string): Promise<{
  buffer: Buffer;
  filename: string;
  count: number;
}> {
  const clients = await fetchCifClients(userId);
  const rows = clients.map(clientToCifRow);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ekonzo";
  workbook.created = new Date();
  workbook.title = "CIF — Fichier client ekonzo";

  const sheet = workbook.addWorksheet("CIF Clients", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = CIF_COLUMNS.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width,
  }));

  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0B3D5C" },
  };
  header.alignment = { vertical: "middle", wrapText: true };
  header.height = 28;

  for (const row of rows) {
    sheet.addRow(row);
  }

  // Feuille détail conventions (toutes les signatures)
  const agrSheet = workbook.addWorksheet("Conventions", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  agrSheet.columns = [
    { header: "ID utilisateur", key: "userId", width: 28 },
    { header: "Nom", key: "name", width: 24 },
    { header: "Téléphone", key: "phone", width: 16 },
    { header: "Version", key: "version", width: 12 },
    { header: "Banque", key: "bank", width: 22 },
    { header: "Signataire", key: "signedName", width: 24 },
    { header: "Méthode", key: "method", width: 12 },
    { header: "Signé le", key: "signedAt", width: 20 },
    { header: "URL PDF", key: "pdfUrl", width: 44 },
    { header: "URL signature", key: "sigUrl", width: 44 },
    { header: "SHA-256 PDF", key: "sha", width: 40 },
  ];
  const agrHeader = agrSheet.getRow(1);
  agrHeader.font = { bold: true, color: { argb: "FFFFFFFF" } };
  agrHeader.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0B3D5C" },
  };

  for (const u of clients) {
    for (const a of u.securitiesAgreements) {
      agrSheet.addRow({
        userId: u.id,
        name: u.name,
        phone: u.phoneNumber ?? "",
        version: a.convention.version,
        bank: a.partnerBankName,
        signedName: a.signedName,
        method: a.signatureMethod,
        signedAt: fmtDate(a.signedAt),
        pdfUrl: conventionPdfApiUrl(u.id),
        sigUrl: a.signatureImagePath ? signatureApiUrl(u.id) : "",
        sha: a.pdfSha256,
      });
    }
  }

  // Feuille méta
  const meta = workbook.addWorksheet("Métadonnées");
  meta.addRow(["Plateforme", "ekonzo — Ministère des Finances RDC"]);
  meta.addRow(["Type", "CIF (Customer Information File)"]);
  meta.addRow(["Généré le", fmtDate(new Date())]);
  meta.addRow(["Nombre de clients", clients.length]);
  meta.addRow([
    "Contenu",
    "Identité, KYC, règlement, comptes MoMo/banque, convention compte-titres + liens documents",
  ]);
  meta.getColumn(1).width = 22;
  meta.getColumn(2).width = 80;

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = userId
    ? `CIF-${userId.slice(0, 8)}-${stamp}.xlsx`
    : `CIF-ekonzo-clients-${stamp}.xlsx`;

  return { buffer, filename, count: clients.length };
}

/** Résout le chemin absolu d'un fichier convention (anti path-traversal). */
export function resolveConventionFile(
  uploadDir: string,
  relativePath: string,
): string | null {
  const absolute = path.join(uploadDir, relativePath);
  if (!absolute.startsWith(uploadDir)) return null;
  return absolute;
}
