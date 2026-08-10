import { createHash } from "crypto";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
} from "pdf-lib";

type PdfInput = {
  title: string;
  version: string;
  partnerBankName: string;
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

const NAVY = rgb(0.059, 0.165, 0.29);
const GREY = rgb(0.333, 0.373, 0.431);
const BLACK = rgb(0.1, 0.1, 0.1);

/** Caractères hors WinAnsi → équivalents ASCII sûrs (polices standard PDF). */
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

  const margin = 50;
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const contentWidth = pageWidth - margin * 2;
  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const ensureSpace = (needed: number) => {
    if (y - needed < margin) {
      page = pdf.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
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
    },
  ) => {
    const lineHeight = opts.size * 1.35;
    for (const line of lines) {
      ensureSpace(lineHeight + 2);
      page.drawText(line, {
        x: margin + (opts.indent ?? 0),
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

  // En-tête
  drawLines(["ekonzo"], {
    size: 14,
    font: fontBold,
    color: NAVY,
  });
  drawLines(
    wrapText(
      sanitizePdfText(
        "Canal numerique de souscription aux valeurs du Tresor - RDC",
      ),
      font,
      9,
      contentWidth,
    ),
    { size: 9, font, color: GREY, gap: 10 },
  );

  drawLines(wrapText(sanitizePdfText(input.title), fontBold, 13, contentWidth), {
    size: 13,
    font: fontBold,
    color: NAVY,
  });
  drawLines(
    wrapText(
      sanitizePdfText(
        `Version ${input.version} - Banque partenaire : ${input.partnerBankName}`,
      ),
      font,
      9,
      contentWidth,
    ),
    { size: 9, font, color: GREY, gap: 14 },
  );

  for (const block of parseBlocks(input.bodyMarkdown)) {
    if (block.type === "h2") {
      y -= 6;
      drawLines(wrapText(block.text, fontBold, 11, contentWidth), {
        size: 11,
        font: fontBold,
        color: NAVY,
        gap: 4,
      });
    } else if (block.type === "li") {
      drawLines(wrapText(`- ${block.text}`, font, 9, contentWidth - 12), {
        size: 9,
        font,
        color: BLACK,
        indent: 12,
        gap: 2,
      });
    } else {
      drawLines(wrapText(block.text, font, 9, contentWidth), {
        size: 9,
        font,
        color: BLACK,
        gap: 4,
      });
    }
  }

  y -= 10;
  drawLines(
    [sanitizePdfText("Preuve de signature electronique")],
    { size: 11, font: fontBold, color: NAVY, gap: 8 },
  );

  if (input.signatureImage && input.signatureImage.length > 0) {
    try {
      const png = await pdf.embedPng(input.signatureImage);
      const maxW = 220;
      const maxH = 80;
      const scale = Math.min(maxW / png.width, maxH / png.height, 1);
      const w = png.width * scale;
      const h = png.height * scale;
      ensureSpace(h + 12);
      page.drawImage(png, {
        x: margin,
        y: y - h,
        width: w,
        height: h,
      });
      y -= h + 10;
    } catch {
      // Image invalide : on continue avec le texte.
    }
  } else if (input.signatureMethod === "TYPED") {
    drawLines(
      wrapText(sanitizePdfText(input.signedName), fontOblique, 18, contentWidth),
      { size: 18, font: fontOblique, color: NAVY, gap: 8 },
    );
  }

  const meta = [
    `Signataire : ${input.signedName}`,
    `Methode : ${input.signatureMethod === "DRAWN" ? "Manuscrite (pad)" : "Nom tape"}`,
    `Identifiant utilisateur : ${input.userId}`,
    `Telephone : ${input.userPhone ?? "-"}`,
    `Date / heure (UTC) : ${input.signedAt.toISOString()}`,
    `Adresse IP : ${input.ipAddress ?? "-"}`,
    `Empreinte de signature (SHA-256) : ${input.signatureHash}`,
  ].map(sanitizePdfText);

  for (const line of meta) {
    drawLines(wrapText(line, font, 9, contentWidth), {
      size: 9,
      font,
      color: BLACK,
      gap: 2,
    });
  }

  y -= 8;
  drawLines(
    wrapText(
      sanitizePdfText(
        "Document genere automatiquement par ekonzo. Conservez-en une copie. " +
          "References : loi n 22/069 art. 66 ; decret n 18/025 ; ordonnance-loi n 23/010.",
      ),
      font,
      8,
      contentWidth,
    ),
    { size: 8, font, color: GREY },
  );

  const bytes = await pdf.save();
  const buffer = Buffer.from(bytes);
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  return { buffer, sha256 };
}
