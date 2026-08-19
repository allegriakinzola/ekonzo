import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { extractDocumentData } from "@/modules/kyc/kyc.service";
import { getKycUserDir } from "@/modules/kyc/kyc-paths";
import { saveKycDocDraft } from "@/modules/kyc/kyc-draft";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

/**
 * POST /api/kyc/extract
 * Upload recto + OCR + persistance DB (KycDraft) pour l'étape selfie.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const userId = session.user.id;

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json(
        {
          error:
            "Impossible de lire la photo (fichier trop volumineux ou requête interrompue). Réessayez avec une image plus légère.",
        },
        { status: 400 },
      );
    }

    const docFront = formData.get("docFront") as File | null;
    if (!docFront) {
      return NextResponse.json(
        { error: "Le recto du document est requis" },
        { status: 400 },
      );
    }
    if (docFront.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Fichier trop volumineux (max 5 Mo)" },
        { status: 400 },
      );
    }

    const mime = (docFront.type || "").toLowerCase();
    if (mime === "image/heic" || mime === "image/heif") {
      return NextResponse.json(
        {
          error:
            "Format HEIC non supporté. Dans Réglages iPhone → Appareil photo → Formats, choisissez « Plus compatible », ou exportez en JPEG.",
        },
        { status: 400 },
      );
    }
    if (mime && !ALLOWED_TYPES.includes(mime)) {
      return NextResponse.json(
        { error: `Format non supporté : ${docFront.type || "inconnu"}` },
        { status: 400 },
      );
    }

    const userDir = getKycUserDir(userId);
    await mkdir(userDir, { recursive: true });

    const rawExt = docFront.name.split(".").pop()?.toLowerCase() || "jpg";
    const ext = ["jpg", "jpeg", "png", "webp"].includes(rawExt) ? rawExt : "jpg";
    const docPath = path.join(userDir, `doc_front.${ext}`);
    const buffer = Buffer.from(await docFront.arrayBuffer());
    await writeFile(docPath, buffer);

    // Persistance durable (nécessaire sur Vercel entre extract et verify-face)
    await saveKycDocDraft(
      userId,
      buffer,
      mime && mime !== "application/octet-stream" ? mime : "image/jpeg",
    );

    try {
      const extracted = await extractDocumentData(docPath);
      const { rawText: _rawText, ...fields } = extracted;

      return NextResponse.json({
        extracted: fields,
        docSaved: true,
      });
    } catch (err) {
      console.error("[KYC extract OCR]", err);
      return NextResponse.json({
        extracted: {},
        docSaved: true,
        extractionFailed: true,
      });
    }
  } catch (err) {
    console.error("[KYC extract fatal]", err);
    return NextResponse.json(
      {
        error:
          "Erreur serveur lors de l'upload du document. Réessayez avec une photo plus petite (JPEG).",
      },
      { status: 500 },
    );
  }
}
