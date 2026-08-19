import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { verifyFaceAndSubmit } from "@/modules/kyc/kyc.service";
import type { KycDocType } from "@/modules/kyc/kyc.types";
import { getKycUserDir } from "@/modules/kyc/kyc-paths";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

function isUploadBlob(value: FormDataEntryValue | null): value is Blob {
  return (
    !!value &&
    typeof value === "object" &&
    "arrayBuffer" in value &&
    "size" in value &&
    (value as Blob).size > 0
  );
}

/**
 * POST /api/kyc/verify-face
 * Selfie + recto obligatoires (re-upload) — le disque /tmp Vercel
 * n'est pas partagé entre les requêtes extract et verify-face.
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
            "Impossible de lire les photos (trop volumineuses). Compressez ou reprenez des clichés plus légers.",
        },
        { status: 400 },
      );
    }

    const selfieRaw = formData.get("selfie");
    const docFrontRaw = formData.get("docFront");
    const docType = formData.get("docType") as KycDocType;
    const firstName = (formData.get("firstName") as string)?.trim();
    const lastName = (formData.get("lastName") as string)?.trim();
    const postName = (formData.get("postName") as string)?.trim() || undefined;
    const dateOfBirth =
      (formData.get("dateOfBirth") as string)?.trim() || undefined;
    const docNumber =
      (formData.get("docNumber") as string)?.trim() || undefined;
    const address = (formData.get("address") as string)?.trim() || undefined;

    if (!isUploadBlob(selfieRaw)) {
      return NextResponse.json(
        { error: "Selfie requis (fichier image)." },
        { status: 400 },
      );
    }
    if (!isUploadBlob(docFrontRaw)) {
      return NextResponse.json(
        {
          error:
            "Le recto du document est requis avec le selfie. Revenez à l'étape photo de la carte, puis réessayez.",
        },
        { status: 400 },
      );
    }

    const selfie = selfieRaw;
    const docFront = docFrontRaw;

    if (!docType || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Type de document, nom et prénom requis" },
        { status: 400 },
      );
    }
    if (selfie.size > MAX_FILE_SIZE || docFront.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Fichier trop volumineux (max 5 Mo par photo)" },
        { status: 400 },
      );
    }

    const selfieType = (selfie.type || "image/jpeg").toLowerCase();
    const docTypeMime = (docFront.type || "image/jpeg").toLowerCase();
    if (
      selfieType &&
      !ALLOWED_TYPES.includes(selfieType) &&
      selfieType !== "application/octet-stream"
    ) {
      return NextResponse.json(
        { error: `Format selfie non supporté : ${selfie.type}` },
        { status: 400 },
      );
    }
    if (
      docTypeMime &&
      !ALLOWED_TYPES.includes(docTypeMime) &&
      docTypeMime !== "application/octet-stream"
    ) {
      return NextResponse.json(
        { error: `Format document non supporté : ${docFront.type}` },
        { status: 400 },
      );
    }

    const userDir = getKycUserDir(userId);
    await mkdir(userDir, { recursive: true });

    const docName =
      "name" in docFront && typeof docFront.name === "string"
        ? docFront.name
        : "doc_front.jpg";
    const selfieName =
      "name" in selfie && typeof selfie.name === "string"
        ? selfie.name
        : "selfie.jpg";

    const docExtRaw = docName.split(".").pop()?.toLowerCase() || "jpg";
    const docExt = ["jpg", "jpeg", "png", "webp"].includes(docExtRaw)
      ? docExtRaw
      : "jpg";
    const selfieExtRaw = selfieName.split(".").pop()?.toLowerCase() || "jpg";
    const selfieExt = ["jpg", "jpeg", "png", "webp"].includes(selfieExtRaw)
      ? selfieExtRaw
      : "jpg";

    const docFrontPath = path.join(userDir, `doc_front.${docExt}`);
    const selfiePath = path.join(userDir, `selfie.${selfieExt}`);

    await writeFile(docFrontPath, Buffer.from(await docFront.arrayBuffer()));
    await writeFile(selfiePath, Buffer.from(await selfie.arrayBuffer()));

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
    console.error("[KYC verify-face fatal]", err);
    return NextResponse.json(
      { error: "Erreur serveur lors de la vérification. Réessayez." },
      { status: 500 },
    );
  }
}
