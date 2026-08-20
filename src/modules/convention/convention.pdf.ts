import { createHash } from "crypto";
import { readFile } from "fs/promises";
import path from "path";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "pdf-lib";

type PdfInput = {
  title: string;
  version: string;
  partnerBankName: string;
  partnerBankShortName?: string;
  /** Chemin public du logo (ex. /logoequity.png) ou buffer PNG/JPG. */
  partnerBankLogoSrc?: string | null;
  bodyMarkdown: string;
  signedName: string;
  userId: string;
  userPhone?: string | null;
  signedAt: Date;
  signatureHash: string;
  ipAddress?: string | null;
  signatureImage?: Buffer | null;
  signatureMethod: "TYPED" | "DRAWN";
};

const NAVY = rgb(0.09, 0.255, 0.4);
const BLUE = rgb(0.09, 0.28, 0.55);
const GREY = rgb(0.4, 0.45, 0.5);
const BLACK = rgb(0.12, 0.12, 0.12);
const LIGHT = rgb(0.96, 0.97, 0.98);
const LINE = rgb(0.82, 0.86, 0.9);
const FLAG_BLUE = rgb(0, 0.58, 0.79);
const FLAG_YELLOW = rgb(1, 0.95, 0.29);
const FLAG_RED = rgb(0.86, 0.22, 0.2);

function sanitizePdfText(input: string): string {
  return input
    .replace(/[«»]/g, '"')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[—–−]/g, "-")
    .replace(/[•·]/g, "-")
    .replace(/…/g, "...")
    .replace(/œ/g, "oe")
    .replace(/Œ/g, "OE")
    .replace(/æ/g, "ae")
    .replace(/Æ/g, "AE")
    .replace(/€/g, "EUR")
    .replace(/[^\x00-\xFF]/g, "?");
}

function parseBlocks(md: string): { type: "h2" | "p" | "li"; text: string }[] {
  const blocks: { type: "h2" | "p" | "li"; text: string }[] = [];
  for (const raw of md.split(/\n+/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("## ")) {
      blocks.push({ type: "h2", text: sanitizePdfText(line.slice(3).trim()) });
    } else if (line.startsWith("- ") || /^\d+\.\s/.test(line)) {
      blocks.push({
        type: "li",
        text: sanitizePdfText(line.replace(/^(-\s|\d+\.\s)/, "").trim()),
      });
    } else {
      blocks.push({
        type: "p",
        text: sanitizePdfText(line.replace(/\*\*(.*?)\*\*/g, "$1")),
      });
    }
  }
  return blocks;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

async function loadLogoImage(
  pdf: PDFDocument,
  logoSrc?: string | null,
): Promise<PDFImage | null> {
  if (!logoSrc) return null;
  try {
    const relative = logoSrc.replace(/^\//, "");
    const absolute = path.join(
      /*turbopackIgnore: true*/ process.cwd(),
      "public",
      relative,
    );
    const bytes = await readFile(absolute);
    if (relative.toLowerCase().endsWith(".png")) {
      return pdf.embedPng(bytes);
    }
    if (
      relative.toLowerCase().endsWith(".jpg") ||
      relative.toLowerCase().endsWith(".jpeg")
    ) {
      return pdf.embedJpg(bytes);
    }
  } catch {
    // logo optionnel
  }
  return null;
}

export function buildSignatureHash(opts: {
  userId: string;
  conventionVersion: string;
  signedName: string;
  signedAtIso: string;
  bodyMarkdown: string;
  signatureImageSha?: string | null;
}): string {
  return createHash("sha256")
    .update(
      [
        opts.userId,
        opts.conventionVersion,
        opts.signedName.trim().toLowerCase(),
        opts.signedAtIso,
        opts.bodyMarkdown,
        opts.signatureImageSha ?? "",
      ].join("|"),
    )
    .digest("hex");
}

export async function generateConventionPdf(input: PdfInput): Promise<{
  buffer: Buffer;
  sha256: string;
}> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(sanitizePdfText(input.title));
  pdf.setAuthor("ekonzo");
  pdf.setSubject(
    sanitizePdfText(`Convention compte-titres v${input.version}`),
  );

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const bankLogo = await loadLogoImage(pdf, input.partnerBankLogoSrc);

  const marginX = 48;
  const marginBottom = 56;
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const contentWidth = pageWidth - marginX * 2;

  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - 36;
  const pages: PDFPage[] = [page];

  const ensureSpace = (needed: number) => {
    if (y - needed < marginBottom) {
      page = pdf.addPage([pageWidth, pageHeight]);
      pages.push(page);
      y = pageHeight - 48;
      // fine top rule on continuation pages
      page.drawRectangle({
        x: 0,
        y: pageHeight - 8,
        width: pageWidth / 3,
        height: 3,
        color: FLAG_BLUE,
      });
      page.drawRectangle({
        x: pageWidth / 3,
        y: pageHeight - 8,
        width: pageWidth / 3,
        height: 3,
        color: FLAG_YELLOW,
      });
      page.drawRectangle({
        x: (pageWidth / 3) * 2,
        y: pageHeight - 8,
        width: pageWidth / 3,
        height: 3,
        color: FLAG_RED,
      });
      y = pageHeight - 28;
    }
  };

  const drawLines = (
    lines: string[],
    opts: {
      size: number;
      font: PDFFont;
      color: ReturnType<typeof rgb>;
      gap?: number;
      indent?: number;
      align?: "left" | "center";
    },
  ) => {
    const lineHeight = opts.size * 1.38;
    for (const line of lines) {
      ensureSpace(lineHeight + 2);
      const textWidth = opts.font.widthOfTextAtSize(line, opts.size);
      const x =
        opts.align === "center"
          ? (pageWidth - textWidth) / 2
          : marginX + (opts.indent ?? 0);
      page.drawText(line, {
        x,
        y: y - opts.size,
        size: opts.size,
        font: opts.font,
        color: opts.color,
        maxWidth: contentWidth - (opts.indent ?? 0),
      });
      y -= lineHeight;
    }
    if (opts.gap) y -= opts.gap;
  };

  // —— En-tête institutionnel ——
  page.drawRectangle({
    x: 0,
    y: pageHeight - 6,
    width: pageWidth / 3,
    height: 6,
    color: FLAG_BLUE,
  });
  page.drawRectangle({
    x: pageWidth / 3,
    y: pageHeight - 6,
    width: pageWidth / 3,
    height: 6,
    color: FLAG_YELLOW,
  });
  page.drawRectangle({
    x: (pageWidth / 3) * 2,
    y: pageHeight - 6,
    width: pageWidth / 3,
    height: 6,
    color: FLAG_RED,
  });

  y = pageHeight - 28;

  // Bandeau logos
  page.drawRectangle({
    x: marginX,
    y: y - 56,
    width: contentWidth,
    height: 64,
    color: LIGHT,
    borderColor: LINE,
    borderWidth: 0.8,
  });

  page.drawText("ekonzo", {
    x: marginX + 14,
    y: y - 28,
    size: 16,
    font: fontBold,
    color: NAVY,
  });
  page.drawText(
    sanitizePdfText("Plateforme de souscription — Ministere des Finances · RDC"),
    {
      x: marginX + 14,
      y: y - 44,
      size: 7.5,
      font,
      color: GREY,
    },
  );

  if (bankLogo) {
    const maxW = 110;
    const maxH = 36;
    const scale = Math.min(maxW / bankLogo.width, maxH / bankLogo.height, 1);
    const w = bankLogo.width * scale;
    const h = bankLogo.height * scale;
    page.drawImage(bankLogo, {
      x: pageWidth - marginX - 14 - w,
      y: y - 22 - h,
      width: w,
      height: h,
    });
  } else {
    const short =
      input.partnerBankShortName ??
      input.partnerBankName.split("(")[0].trim();
    const label = sanitizePdfText(short);
    const tw = fontBold.widthOfTextAtSize(label, 10);
    page.drawText(label, {
      x: pageWidth - marginX - 14 - tw,
      y: y - 36,
      size: 10,
      font: fontBold,
      color: BLUE,
    });
  }

  y -= 80;

  // Titre centré
  drawLines(
    wrapText(
      sanitizePdfText("CONVENTION DE COMPTE-TITRES"),
      fontBold,
      14,
      contentWidth,
    ),
    { size: 14, font: fontBold, color: NAVY, align: "center", gap: 2 },
  );
  drawLines(
    wrapText(
      sanitizePdfText("Bons et Obligations du Tresor"),
      font,
      10,
      contentWidth,
    ),
    { size: 10, font, color: GREY, align: "center", gap: 4 },
  );
  drawLines(
    [
      sanitizePdfText(
        `Version ${input.version}  ·  Banque teneuse : ${input.partnerBankShortName ?? input.partnerBankName}`,
      ),
    ],
    { size: 8, font, color: GREY, align: "center", gap: 12 },
  );

  // Encadré parties
  const partiesTitle = sanitizePdfText("Entre les soussignes");
  const partyBank = sanitizePdfText(
    `La Banque : ${input.partnerBankName}`,
  );
  const partyHolder = sanitizePdfText(
    `Le Titulaire : ${input.signedName}`,
  );
  const partyLines = [
    ...wrapText(partyBank, font, 9, contentWidth - 24),
    ...wrapText(partyHolder, font, 9, contentWidth - 24),
  ];
  const boxH = 28 + partyLines.length * 12;
  ensureSpace(boxH + 10);
  page.drawRectangle({
    x: marginX,
    y: y - boxH,
    width: contentWidth,
    height: boxH,
    color: rgb(1, 1, 1),
    borderColor: NAVY,
    borderWidth: 1,
  });
  page.drawText(partiesTitle, {
    x: marginX + 12,
    y: y - 14,
    size: 8,
    font: fontBold,
    color: NAVY,
  });
  let py = y - 28;
  for (const line of partyLines) {
    page.drawText(line, {
      x: marginX + 12,
      y: py,
      size: 9,
      font,
      color: BLACK,
    });
    py -= 12;
  }
  y -= boxH + 14;

  // Corps condensé
  for (const block of parseBlocks(input.bodyMarkdown)) {
    if (block.type === "h2") {
      y -= 4;
      ensureSpace(18);
      page.drawRectangle({
        x: marginX,
        y: y - 14,
        width: 3,
        height: 12,
        color: BLUE,
      });
      drawLines(wrapText(block.text, fontBold, 10, contentWidth - 10), {
        size: 10,
        font: fontBold,
        color: NAVY,
        indent: 8,
        gap: 4,
      });
    } else if (block.type === "li") {
      drawLines(wrapText(`- ${block.text}`, font, 9, contentWidth - 14), {
        size: 9,
        font,
        color: BLACK,
        indent: 10,
        gap: 2,
      });
    } else {
      drawLines(wrapText(block.text, font, 9, contentWidth), {
        size: 9,
        font,
        color: BLACK,
        gap: 5,
      });
    }
  }

  // Bloc signature
  y -= 8;
  ensureSpace(130);
  page.drawLine({
    start: { x: marginX, y },
    end: { x: pageWidth - marginX, y },
    thickness: 0.8,
    color: LINE,
  });
  y -= 16;

  drawLines([sanitizePdfText("Fait electroniquement")], {
    size: 10,
    font: fontBold,
    color: NAVY,
    gap: 6,
  });

  const sigBoxW = contentWidth * 0.55;
  const sigBoxH = 72;
  ensureSpace(sigBoxH + 40);
  page.drawRectangle({
    x: marginX,
    y: y - sigBoxH,
    width: sigBoxW,
    height: sigBoxH,
    borderColor: LINE,
    borderWidth: 0.8,
    color: rgb(1, 1, 1),
  });
  page.drawText(sanitizePdfText("Signature du Titulaire"), {
    x: marginX + 8,
    y: y - 12,
    size: 7,
    font,
    color: GREY,
  });

  if (input.signatureImage && input.signatureImage.length > 0) {
    try {
      const png = await pdf.embedPng(input.signatureImage);
      const maxW = sigBoxW - 20;
      const maxH = sigBoxH - 28;
      const scale = Math.min(maxW / png.width, maxH / png.height, 1);
      const w = png.width * scale;
      const h = png.height * scale;
      page.drawImage(png, {
        x: marginX + 10,
        y: y - sigBoxH + 8,
        width: w,
        height: h,
      });
    } catch {
      // ignore
    }
  } else if (input.signatureMethod === "TYPED") {
    page.drawText(sanitizePdfText(input.signedName), {
      x: marginX + 12,
      y: y - 42,
      size: 16,
      font: fontOblique,
      color: NAVY,
    });
  }

  const dateStr = input.signedAt.toLocaleString("fr-FR", {
    timeZone: "Africa/Kinshasa",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  page.drawText(sanitizePdfText(`Le Titulaire`), {
    x: marginX + sigBoxW + 16,
    y: y - 18,
    size: 8,
    font: fontBold,
    color: GREY,
  });
  page.drawText(sanitizePdfText(input.signedName), {
    x: marginX + sigBoxW + 16,
    y: y - 34,
    size: 10,
    font: fontBold,
    color: BLACK,
    maxWidth: contentWidth - sigBoxW - 20,
  });
  page.drawText(sanitizePdfText(`Date : ${dateStr}`), {
    x: marginX + sigBoxW + 16,
    y: y - 50,
    size: 8,
    font,
    color: BLACK,
    maxWidth: contentWidth - sigBoxW - 20,
  });
  page.drawText(
    sanitizePdfText(
      `Tel. : ${input.userPhone ?? "-"}  ·  ${input.signatureMethod === "DRAWN" ? "Signature manuscrite" : "Signature tapee"}`,
    ),
    {
      x: marginX + sigBoxW + 16,
      y: y - 64,
      size: 7.5,
      font,
      color: GREY,
      maxWidth: contentWidth - sigBoxW - 20,
    },
  );

  y -= sigBoxH + 14;

  drawLines(
    wrapText(
      sanitizePdfText(
        `Empreinte de signature : ${input.signatureHash.slice(0, 24)}…`,
      ),
      font,
      7,
      contentWidth,
    ),
    { size: 7, font, color: GREY, gap: 4 },
  );

  drawLines(
    wrapText(
      sanitizePdfText(
        "Document genere par ekonzo. Refs : loi n 22/069 art. 66 ; decret n 18/025 ; OL n 23/010.",
      ),
      font,
      7,
      contentWidth,
    ),
    { size: 7, font, color: GREY },
  );

  // Pieds de page
  const total = pages.length;
  pages.forEach((p, i) => {
    p.drawLine({
      start: { x: marginX, y: 36 },
      end: { x: pageWidth - marginX, y: 36 },
      thickness: 0.5,
      color: LINE,
    });
    p.drawText(
      sanitizePdfText(
        `ekonzo  ·  Convention compte-titres v${input.version}  ·  ${input.partnerBankShortName ?? "Banque partenaire"}`,
      ),
      {
        x: marginX,
        y: 22,
        size: 7,
        font,
        color: GREY,
      },
    );
    const pageLabel = `Page ${i + 1} / ${total}`;
    const pw = font.widthOfTextAtSize(pageLabel, 7);
    p.drawText(pageLabel, {
      x: pageWidth - marginX - pw,
      y: 22,
      size: 7,
      font,
      color: GREY,
    });
  });

  const bytes = await pdf.save();
  const buffer = Buffer.from(bytes);
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  return { buffer, sha256 };
}
