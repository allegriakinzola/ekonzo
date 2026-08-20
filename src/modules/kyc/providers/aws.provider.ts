import type { KycProvider, KycExtractedData, KycFaceMatchResult } from "../kyc.types";

/**
 * Provider AWS — Textract (OCR) + Rekognition (face matching).
 * Nécessite : AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION dans .env
 */

function awsCredentials() {
  return {
    region: process.env.AWS_REGION ?? "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  };
}

const DATE_REGEX = /(\d{2}[\/\-.]\d{2}[\/\-.]\d{4}|\d{4}[\/\-.]\d{2}[\/\-.]\d{2})/;

/** Normalise une ligne pour comparaison de libellés. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** True si la ligne est (ou commence par) un des libellés. */
function matchLabel(line: string, labels: string[]): { label: string } | null {
  const n = norm(line);
  // Trier les libellés les plus longs d'abord (évite "nom" qui match "nom du pere")
  const sorted = [...labels].sort((a, b) => norm(b).length - norm(a).length);

  for (const label of sorted) {
    const l = norm(label);
    if (n === l) return { label: l };
    if (n.startsWith(l + ":") || n.startsWith(l + " :")) return { label: l };

    // "Nom KINZOLA" sans deux-points — mais pas "Nom du père" / "Nom de la mère" / "NOM CI"
    if (n.startsWith(l + " ") && n.length > l.length + 1) {
      if (
        l === "nom" &&
        (n.startsWith("nom du ") ||
          n.startsWith("nom de ") ||
          n.startsWith("nom ci") ||
          n.startsWith("nom c.i") ||
          n.startsWith("nom c i"))
      ) {
        continue;
      }
      return { label: l };
    }
  }
  return null;
}

function isLabelLine(line: string, labels: string[]): boolean {
  const n = norm(line);
  return labels.some((label) => {
    const l = norm(label);
    return n === l || n.startsWith(l + ":") || n.startsWith(l + " :");
  });
}

/** Libellés métier RDC — ne jamais les prendre comme valeur. */
const KNOWN_LABELS = [
  "nom",
  "sexe",
  "postnom/prenom",
  "postnom / prenom",
  "post-nom",
  "postnom",
  "prenom",
  "prénom",
  "date / lieu de naissance",
  "date/lieu de naissance",
  "date de naissance",
  "adresse",
  "origine",
  "nom du pere",
  "nom de la mere",
  "lieu et date de delivrance",
  "code ci",
  "code c.i",
  "nom ci",
  "nom c.i",
  "nn",
  "nn.s",
  "nn.s.",
  "nns",
];

function looksLikeLabel(line: string): boolean {
  const n = norm(line);
  if (KNOWN_LABELS.includes(n)) return true;
  if (n.startsWith("postnom")) return true;
  if (n.startsWith("date /") || n.startsWith("date/")) return true;
  if (n.startsWith("code ci") || n.startsWith("nom ci")) return true;
  if (n.startsWith("nn.s") || n.startsWith("nn ")) return true;
  return false;
}

/** CODE CI = numéro réel de la carte d'électeur (ex. 1004111). */
function extractCodeCi(lines: string[]): string | undefined {
  const fromLabel = valueAfterLabel(lines, ["code ci", "code c.i", "code c i"], {
    maxLines: 1,
  });
  if (fromLabel) {
    const digits = fromLabel.replace(/\D/g, "");
    // CODE CI typique : 6–10 chiffres (souvent 7). Exclure le NN.S. (10–13 chiffres).
    if (/^\d{6,9}$/.test(digits)) return digits;
  }

  // Fallback : ligne seule du type 1004111 près d'un libellé CODE CI
  const codeIdx = lines.findIndex((l) => /code\s*c\.?\s*i/i.test(norm(l)));
  if (codeIdx >= 0) {
    for (let i = 0; i <= 2; i++) {
      const candidate = (lines[codeIdx + i] ?? "").replace(/\s/g, "");
      const m = candidate.match(/(\d{6,9})/);
      if (m && !/^\d{10,}$/.test(m[1])) return m[1];
    }
  }

  // Dernier recours : nombre 6–9 chiffres commençant souvent par 1 (ex. 1004…)
  const standalone = lines
    .map((l) => l.replace(/\s/g, ""))
    .map((l) => l.match(/^(\d{6,9})$/)?.[1])
    .find((d) => d && !/^\d{10,}$/.test(d));
  return standalone;
}

/** Valeur sur la même ligne après le libellé, ou sur la/les lignes suivantes. */
function valueAfterLabel(
  lines: string[],
  labels: string[],
  opts: { maxLines?: number; stopLabels?: string[] } = {}
): string | undefined {
  const idx = lines.findIndex((line) => matchLabel(line, labels));
  if (idx < 0) return undefined;

  const maxLines = opts.maxLines ?? 1;
  const stopLabels = opts.stopLabels ?? [];
  const matched = matchLabel(lines[idx], labels)!;
  const raw = lines[idx];
  const nRaw = norm(raw);

  const parts: string[] = [];

  // Valeur inline : après ":" ou après le libellé
  let inline = "";
  if (nRaw.includes(":")) {
    inline = raw.split(/:\s*/).slice(1).join(":").trim();
  } else if (nRaw.startsWith(matched.label + " ")) {
    inline = raw.slice(matched.label.length).trim();
    // Si le slice a cassé la casse/accents, reprendre après le premier mot du libellé
    const labelWordCount = matched.label.split(" ").length;
    inline = raw.split(/\s+/).slice(labelWordCount).join(" ").trim();
  }

  if (inline && !looksLikeLabel(inline) && inline.length > 1) {
    parts.push(inline);
  }

  const need = Math.max(0, maxLines - parts.length);
  for (let i = 1; i <= need + (parts.length === 0 ? maxLines : 0) && parts.length < maxLines; i++) {
    const next = lines[idx + i]?.trim();
    if (!next) break;
    if (stopLabels.length && (isLabelLine(next, stopLabels) || looksLikeLabel(next))) break;
    if (looksLikeLabel(next)) break;
    parts.push(next);
  }

  const value = parts.join(" ").replace(/\s+/g, " ").trim();
  return value || undefined;
}

function extractDate(text: string | undefined): string | undefined {
  if (!text) return undefined;
  return text.match(DATE_REGEX)?.[1];
}

/**
 * Parse spécifique Carte d'électeur RDC (CENI).
 * Format typique :
 *   Nom → KINZOLA
 *   Postnom/Prenom → NKUNDIDI/ALEGRIA
 *   Date / Lieu de naissance → 09/11/2001 KINSHASA
 *   Adresse → NGEBA N°15 + ligne suivante (commune/ville)
 *   CODE CI → 1004111  ← numéro réel de la carte
 *   NN.S. → 30186733319 ← n° national (ne pas utiliser comme n° de carte)
 *   NOM CI → libellé distinct (ne pas confondre avec Nom)
 */
function parseCarteElecteur(lines: string[]): KycExtractedData | null {
  const joined = norm(lines.join(" "));
  const isVoterCard =
    joined.includes("electeur") ||
    joined.includes("carte d'electeur") ||
    lines.some((l) => /code\s*c\.?\s*i/i.test(norm(l)));

  if (!isVoterCard) return null;

  const stop = [
    "nom",
    "sexe",
    "postnom/prenom",
    "postnom / prenom",
    "date / lieu de naissance",
    "date/lieu de naissance",
    "adresse",
    "origine",
    "nom du pere",
    "nom de la mere",
    "lieu et date de delivrance",
    "code ci",
    "nom ci",
    "nn.s",
    "nn.s.",
  ];

  // Chercher le vrai champ « Nom » (pas « NOM CI » / « Nom du père »)
  let lastName = valueAfterLabel(lines, ["nom"], {
    maxLines: 1,
    stopLabels: stop.filter((s) => s !== "nom"),
  });

  // Si OCR a collé « Nom KINZOLA » sur une ligne isolée après filtrage NOM CI
  if (!lastName || /^(ci|nn|m|f|danel)$/i.test(lastName)) {
    const nomIdx = lines.findIndex((line) => {
      const n = norm(line);
      return (
        n === "nom" ||
        n === "nom:" ||
        /^nom\s*:/i.test(n) ||
        (/^nom\s+[a-z]/i.test(n) &&
          !n.startsWith("nom du ") &&
          !n.startsWith("nom de ") &&
          !n.startsWith("nom ci"))
      );
    });
    if (nomIdx >= 0) {
      const line = lines[nomIdx];
      const n = norm(line);
      let candidate = "";
      if (n.includes(":")) {
        candidate = line.split(/:\s*/).slice(1).join(":").trim();
      } else if (/^nom\s+/i.test(line)) {
        candidate = line.replace(/^nom\s*:?\s*/i, "").trim();
      }
      if (!candidate || looksLikeLabel(candidate)) {
        candidate = (lines[nomIdx + 1] ?? "").trim();
      }
      if (
        candidate &&
        !looksLikeLabel(candidate) &&
        /^[A-Za-zÀ-ÿ' -]{2,}$/.test(candidate) &&
        !/^(ci|nn|m|f)$/i.test(candidate)
      ) {
        lastName = candidate;
      }
    }
  }

  // "Postnom/Prenom" → NKUNDIDI/ALEGRIA
  const postPrenom = valueAfterLabel(
    lines,
    ["postnom/prenom", "postnom / prenom", "post-nom/prenom", "postnom prenom"],
    { maxLines: 1, stopLabels: stop }
  );

  let postName: string | undefined;
  let firstName: string | undefined;
  if (postPrenom) {
    const [post, prenom] = postPrenom.split("/").map((s) => s.trim());
    postName = post || undefined;
    firstName = prenom || undefined;
  }

  const birthLine = valueAfterLabel(
    lines,
    ["date / lieu de naissance", "date/lieu de naissance", "date de naissance"],
    { maxLines: 1, stopLabels: stop }
  );
  const dateOfBirth = extractDate(birthLine);

  const rawAddress = valueAfterLabel(lines, ["adresse"], {
    maxLines: 2,
    stopLabels: ["origine", "nom du pere", "nom de la mere", "lieu et date de delivrance"],
  });
  const address = rawAddress
    ?.replace(/\bCENI\b/gi, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+\/\s*/g, "/")
    .replace(/\bVilled\b/gi, "Ville")
    .trim();

  // Numéro de carte = CODE CI (ex. 1004111), pas le NN.S. (ex. 30186733319)
  const codeCi = extractCodeCi(lines);
  const nationalId = lines
    .map((l) => l.replace(/\s/g, ""))
    .find((l) => /^\d{10,13}$/.test(l));
  const serial = lines.find((l) => /^[A-Z]\d\s*\d{2,3}\.\d{6,}$/i.test(l.trim()));

  const docNumber =
    codeCi ?? serial?.replace(/\s+/g, " ").trim() ?? nationalId;

  const cleanLast =
    lastName &&
    lastName.length >= 2 &&
    !/^(ci|nn|m|f)$/i.test(lastName) &&
    !/postnom|pere|mere|sexe|code/i.test(lastName)
      ? lastName.toUpperCase()
      : undefined;

  return {
    lastName: cleanLast,
    postName: postName?.toUpperCase(),
    firstName: firstName?.toUpperCase(),
    dateOfBirth,
    address,
    docNumber,
  };
}

/** Parse générique (passeport / CNI / permis) — mots-clés plus stricts. */
function parseGeneric(lines: string[]): KycExtractedData {
  const stop = [
    "nom",
    "surname",
    "post-nom",
    "postnom",
    "prenom",
    "prénom",
    "given name",
    "adresse",
    "address",
    "date de naissance",
    "nationalite",
  ];

  const lastName = valueAfterLabel(lines, ["nom", "surname"], { maxLines: 1, stopLabels: stop });
  const postName = valueAfterLabel(lines, ["post-nom", "postnom", "post nom"], {
    maxLines: 1,
    stopLabels: stop,
  });
  const firstName = valueAfterLabel(lines, ["prénom", "prenom", "given name"], {
    maxLines: 1,
    stopLabels: stop,
  });

  const birthLine =
    valueAfterLabel(lines, ["date de naissance", "né le", "date of birth"], {
      maxLines: 1,
      stopLabels: stop,
    }) ?? lines.find((l) => DATE_REGEX.test(l));

  const address = valueAfterLabel(lines, ["adresse", "address", "domicile", "résidence"], {
    maxLines: 2,
    stopLabels: stop,
  });

  const docNumber =
    valueAfterLabel(lines, ["n° carte", "no carte", "numéro de document", "passport no", "card no"], {
      maxLines: 1,
      stopLabels: stop,
    }) ??
    lines
      .map((l) => l.replace(/\s/g, ""))
      .find((l) => /^\d{10,13}$/.test(l) || /^[A-Z0-9]{8,}$/i.test(l));

  return {
    lastName,
    postName,
    firstName,
    dateOfBirth: extractDate(birthLine),
    address,
    docNumber,
  };
}

export class AwsKycProvider implements KycProvider {
  async extractDocument(docPath: string): Promise<KycExtractedData> {
    const { TextractClient, DetectDocumentTextCommand } = await import(
      "@aws-sdk/client-textract"
    );
    const fs = await import("fs");

    const textract = new TextractClient(awsCredentials());
    const bytes = fs.readFileSync(docPath);

    const result = await textract.send(
      new DetectDocumentTextCommand({ Document: { Bytes: bytes } })
    );

    const lines = (result.Blocks ?? [])
      .filter((b) => b.BlockType === "LINE" && (b.Confidence ?? 0) > 50)
      .map((b) => (b.Text ?? "").trim())
      .filter(Boolean);

    const rawText = lines.join("\n");
    console.log("[KYC OCR lines]\n" + rawText);

    const voter = parseCarteElecteur(lines);
    const data = voter ?? parseGeneric(lines);

    return { ...data, rawText };
  }

  async compareFaces(docPath: string, selfiePath: string): Promise<KycFaceMatchResult> {
    const { RekognitionClient, CompareFacesCommand } = await import(
      "@aws-sdk/client-rekognition"
    );
    const fs = await import("fs");

    const rekognition = new RekognitionClient(awsCredentials());

    const selfieBytes = fs.readFileSync(selfiePath);
    const docBytes = fs.readFileSync(docPath);

    try {
      const result = await rekognition.send(
        new CompareFacesCommand({
          SourceImage: { Bytes: selfieBytes },
          TargetImage: { Bytes: docBytes },
          SimilarityThreshold: 70,
        })
      );

      const similarity = result.FaceMatches?.[0]?.Similarity ?? 0;
      return { faceMatch: similarity >= 85, similarity: Math.round(similarity) };
    } catch {
      return { faceMatch: false, similarity: 0 };
    }
  }
}
