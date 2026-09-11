import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";

const DISCARDED = ["FAILED", "CANCELLED"] as const;

export type CifClient = Awaited<ReturnType<typeof fetchCifClients>>[number];

/**
 * Fichier client (CIF) : identité, banque partenaire liée et activité de
 * souscription. Le règlement passe exclusivement par la banque liée ;
 * aucun profil de règlement ni compte Mobile Money n'est conservé côté ekonzo.
 */
export async function fetchCifClients(userId?: string) {
  return prisma.user.findMany({
    where: {
      role: "CLIENT",
      emailVerified: true,
      ...(userId ? { id: userId } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      bankLink: {
        include: {
          partnerBank: {
            select: { code: true, name: true, shortName: true, logoUrl: true },
          },
        },
      },
      subscriptions: {
        where: { status: { notIn: [...DISCARDED] } },
        select: {
          amount: true,
          currency: true,
          status: true,
          createdAt: true,
        },
      },
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

export function clientActivity(u: CifClient) {
  const cdf = u.subscriptions
    .filter((s) => s.currency === "CDF")
    .reduce((sum, s) => sum + Number(s.amount), 0);
  const usd = u.subscriptions
    .filter((s) => s.currency === "USD")
    .reduce((sum, s) => sum + Number(s.amount), 0);
  const last = u.subscriptions.reduce<Date | null>(
    (acc, s) => (!acc || s.createdAt > acc ? s.createdAt : acc),
    null,
  );
  return { count: u.subscriptions.length, cdf, usd, last };
}

/** Une ligne CIF par client. */
export function clientToCifRow(u: CifClient) {
  const link = u.bankLink;
  const activity = clientActivity(u);

  return {
    userId: u.id,
    name: u.name,
    phoneNumber: u.phoneNumber ?? "",
    email: u.email ?? "",
    banned: boolFr(u.banned),
    createdAt: fmtDate(u.createdAt),

    bankCode: link?.partnerBank.code ?? "",
    bankName: link?.partnerBank.name ?? "",
    bankShortName: link?.partnerBank.shortName ?? "",
    bankCustomerId: link?.bankCustomerId ?? "",
    bankCustomerEmail: link?.customerEmail ?? "",
    bankAccountName: link?.accountName ?? "",
    bankAccountNumber: link?.accountNumber ?? "",
    bankCurrency: link?.currency ?? "",
    linkedAt: fmtDate(link?.linkedAt),

    subscriptionCount: activity.count,
    volumeCdf: activity.cdf,
    volumeUsd: activity.usd,
    lastSubscriptionAt: fmtDate(activity.last),
  };
}

const CIF_COLUMNS: {
  header: string;
  key: keyof ReturnType<typeof clientToCifRow>;
  width: number;
}[] = [
  { header: "ID utilisateur", key: "userId", width: 28 },
  { header: "Nom affiché", key: "name", width: 28 },
  { header: "Téléphone", key: "phoneNumber", width: 16 },
  { header: "Email", key: "email", width: 28 },
  { header: "Banni", key: "banned", width: 10 },
  { header: "Inscrit le", key: "createdAt", width: 20 },

  { header: "Banque — Code", key: "bankCode", width: 12 },
  { header: "Banque — Nom", key: "bankName", width: 28 },
  { header: "Banque — Sigle", key: "bankShortName", width: 12 },
  { header: "Banque — ID client", key: "bankCustomerId", width: 22 },
  { header: "Banque — Email client", key: "bankCustomerEmail", width: 28 },
  { header: "Compte — Titulaire", key: "bankAccountName", width: 24 },
  { header: "Compte — Numéro", key: "bankAccountNumber", width: 20 },
  { header: "Compte — Devise", key: "bankCurrency", width: 10 },
  { header: "Banque liée le", key: "linkedAt", width: 20 },

  { header: "Nb souscriptions", key: "subscriptionCount", width: 14 },
  { header: "Volume souscrit (CDF)", key: "volumeCdf", width: 20 },
  { header: "Volume souscrit (USD)", key: "volumeUsd", width: 20 },
  { header: "Dernière souscription", key: "lastSubscriptionAt", width: 20 },
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
  sheet.getColumn("volumeCdf").numFmt = "#,##0.00";
  sheet.getColumn("volumeUsd").numFmt = "#,##0.00";

  const meta = workbook.addWorksheet("Métadonnées");
  meta.addRow(["Plateforme", "ekonzo — Ministère des Finances RDC"]);
  meta.addRow(["Type", "CIF (Customer Information File)"]);
  meta.addRow(["Généré le", fmtDate(new Date())]);
  meta.addRow(["Nombre de clients", clients.length]);
  meta.addRow([
    "Contenu",
    "Identité, banque partenaire liée, compte de règlement, activité de souscription (hors tentatives échouées/annulées)",
  ]);
  meta.getColumn(1).width = 22;
  meta.getColumn(2).width = 100;

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = userId
    ? `CIF-${userId.slice(0, 8)}-${stamp}.xlsx`
    : `CIF-ekonzo-clients-${stamp}.xlsx`;

  return { buffer, filename, count: clients.length };
}
