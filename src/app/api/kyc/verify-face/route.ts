import { NextRequest, NextResponse } from "next/server";
import { writeFile, readdir } from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { verifyFaceAndSubmit } from "@/modules/kyc/kyc.service";
import type { KycDocType } from "@/modules/kyc/kyc.types";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "kyc");
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * POST /api/kyc/verify-face
 * Étape 2 du KYC : upload du selfie + comparaison faciale avec le document
 * uploadé à l'étape 1. Si le visage correspond → KYC VERIFIED automatiquement.
 * Reçoit aussi les champs confirmés/corrigés par l'utilisateur.
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

  const selfie = formData.get("selfie") as File | null;
  const docType = formData.get("docType") as KycDocType;
  const firstName = (formData.get("firstName") as string)?.trim();
  const lastName = (formData.get("lastName") as string)?.trim();
  const postName = (formData.get("postName") as string)?.trim() || undefined;
  const dateOfBirth = (formData.get("dateOfBirth") as string)?.trim() || undefined;
  const docNumber = (formData.get("docNumber") as string)?.trim() || undefined;
  const address = (formData.get("address") as string)?.trim() || undefined;

  if (!selfie || !docType || !firstName || !lastName) {
    return NextResponse.json({ error: "Selfie, type de document, nom et prénom requis" }, { status: 400 });
  }
  if (selfie.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Selfie trop volumineux (max 5 Mo)" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(selfie.type)) {
    return NextResponse.json({ error: `Format non supporté : ${selfie.type}` }, { status: 400 });
  }

  // Retrouver le recto uploadé à l'étape 1
  const userDir = path.join(UPLOAD_DIR, userId);
  let docFrontPath: string;
  try {
    const files = await readdir(userDir);
    const docFile = files.find((f) => f.startsWith("doc_front."));
    if (!docFile) throw new Error("no doc");
    docFrontPath = path.join(userDir, docFile);
  } catch {
    return NextResponse.json(
      { error: "Document introuvable — recommencez l'étape d'upload du document" },
      { status: 400 }
    );
  }

  const ext = selfie.name.split(".").pop() ?? "jpg";
  const selfiePath = path.join(userDir, `selfie.${ext}`);
  await writeFile(selfiePath, Buffer.from(await selfie.arrayBuffer()));

  try {
    const result = await verifyFaceAndSubmit({
      userId,
      docType,
      firstName,
      lastName,
      postName,
      dateOfBirth,
      docNumber,
      address,
      docFrontPath,
      selfiePath,
    });

    return NextResponse.json({
      approved: result.approved,
      similarity: result.similarity,
      status: result.status,
      message: result.approved
        ? "Identité vérifiée avec succès."
        : "Le visage ne correspond pas suffisamment. Un agent va examiner votre dossier sous 24–48h.",
    });
  } catch (err) {
    console.error("[KYC verify-face]", err);
    return NextResponse.json({ error: "Erreur serveur lors de la vérification" }, { status: 500 });
  }
}
