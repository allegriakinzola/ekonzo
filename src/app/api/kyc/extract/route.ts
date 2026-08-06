import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { extractDocumentData } from "@/modules/kyc/kyc.service";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "kyc");
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * POST /api/kyc/extract
 * Étape 1 du KYC : upload du recto du document + extraction OCR.
 * Retourne les champs extraits (nom, post-nom, prénom, date de naissance,
 * n° document, adresse) que l'utilisateur pourra corriger avant confirmation.
 */
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const userId = session.user.id;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const docFront = formData.get("docFront") as File | null;
  if (!docFront) {
    return NextResponse.json({ error: "Le recto du document est requis" }, { status: 400 });
  }
  if (docFront.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 5 Mo)" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(docFront.type)) {
    return NextResponse.json({ error: `Format non supporté : ${docFront.type}` }, { status: 400 });
  }

  const userDir = path.join(UPLOAD_DIR, userId);
  await mkdir(userDir, { recursive: true });

  const ext = docFront.name.split(".").pop() ?? "jpg";
  const docPath = path.join(userDir, `doc_front.${ext}`);
  const buffer = Buffer.from(await docFront.arrayBuffer());
  await writeFile(docPath, buffer);

  try {
    const extracted = await extractDocumentData(docPath);
    // rawText interne — inutile côté client
    const { rawText: _rawText, ...fields } = extracted;

    return NextResponse.json({
      extracted: fields,
      docSaved: true,
    });
  } catch (err) {
    console.error("[KYC extract]", err);
    // Le document est sauvegardé — l'utilisateur saisira les champs manuellement
    return NextResponse.json({
      extracted: {},
      docSaved: true,
      extractionFailed: true,
    });
  }
}
