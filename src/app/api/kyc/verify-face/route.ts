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

function isUploadFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    "size" in value &&
    typeof (value as File).size === "number" &&
    (value as File).size > 0
  );
}

function bufferFromBase64(raw: string): Buffer | null {
  const cleaned = raw.replace(/^data:image\/\w+;base64,/, "").trim();
  if (!cleaned || cleaned.length < 100) return null;
  try {
    const buf = Buffer.from(cleaned, "base64");
    return buf.length > 0 ? buf : null;
  } catch {
    return null;
  }
}

/**
 * POST /api/kyc/verify-face
 * Accepte le recto soit en fichier multipart (docFront), soit en base64
 * (docFrontBase64) — plus fiable sur mobile / Vercel.
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
    const docFrontBase64 = String(formData.get("docFrontBase64") ?? "");
    const docType = formData.get("docType") as KycDocType;
    const firstName = (formData.get("firstName") as string)?.trim();
    const lastName = (formData.get("lastName") as string)?.trim();
    const postName = (formData.get("postName") as string)?.trim() || undefined;
    const dateOfBirth =
      (formData.get("dateOfBirth") as string)?.trim() || undefined;
    const docNumber =
      (formData.get("docNumber") as string)?.trim() || undefined;
    const address = (formData.get("address") as string)?.trim() || undefined;

    if (!isUploadFile(selfieRaw) && !String(formData.get("selfieBase64") ?? "")) {
      return NextResponse.json(
        { error: "Selfie requis (fichier image)." },
        { status: 400 },
      );
    }

    if (!docType || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Type de document, nom et prénom requis" },
        { status: 400 },
      );
    }

    const userDir = getKycUserDir(userId);
    await mkdir(userDir, { recursive: true });

    // --- Recto : File OU base64 ---
    let docFrontPath: string;
    if (isUploadFile(docFrontRaw)) {
      if (docFrontRaw.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: "Document trop volumineux (max 5 Mo)" },
          { status: 400 },
        );
      }
      const mime = (docFrontRaw.type || "image/jpeg").toLowerCase();
      if (
        mime &&
        !ALLOWED_TYPES.includes(mime) &&
        mime !== "application/octet-stream"
      ) {
        return NextResponse.json(
          { error: `Format document non supporté : ${docFrontRaw.type}` },
          { status: 400 },
        );
      }
      const docExtRaw = (docFrontRaw.name || "doc.jpg").split(".").pop()?.toLowerCase() || "jpg";
      const docExt = ["jpg", "jpeg", "png", "webp"].includes(docExtRaw)
        ? docExtRaw
        : "jpg";
      docFrontPath = path.join(userDir, `doc_front.${docExt}`);
      await writeFile(docFrontPath, Buffer.from(await docFrontRaw.arrayBuffer()));
    } else {
      const buf = bufferFromBase64(docFrontBase64);
      if (!buf) {
        console.error("[KYC verify-face] docFront missing", {
          keys: [...formData.keys()],
          docFrontType: docFrontRaw == null ? "null" : typeof docFrontRaw,
          hasBase64: docFrontBase64.length > 0,
          base64Len: docFrontBase64.length,
        });
        return NextResponse.json(
          {
            error:
              "Le recto du document est requis avec le selfie. Revenez à l'étape photo de la carte, puis réessayez.",
          },
          { status: 400 },
        );
      }
      if (buf.length > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: "Document trop volumineux (max 5 Mo)" },
          { status: 400 },
        );
      }
      docFrontPath = path.join(userDir, "doc_front.jpg");
      await writeFile(docFrontPath, buf);
    }

    // --- Selfie : File OU base64 ---
    let selfiePath: string;
    if (isUploadFile(selfieRaw)) {
      if (selfieRaw.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: "Selfie trop volumineux (max 5 Mo)" },
          { status: 400 },
        );
      }
      const mime = (selfieRaw.type || "image/jpeg").toLowerCase();
      if (
        mime &&
        !ALLOWED_TYPES.includes(mime) &&
        mime !== "application/octet-stream"
      ) {
        return NextResponse.json(
          { error: `Format selfie non supporté : ${selfieRaw.type}` },
          { status: 400 },
        );
      }
      const selfieExtRaw =
        (selfieRaw.name || "selfie.jpg").split(".").pop()?.toLowerCase() || "jpg";
      const selfieExt = ["jpg", "jpeg", "png", "webp"].includes(selfieExtRaw)
        ? selfieExtRaw
        : "jpg";
      selfiePath = path.join(userDir, `selfie.${selfieExt}`);
      await writeFile(selfiePath, Buffer.from(await selfieRaw.arrayBuffer()));
    } else {
      const selfieB64 = String(formData.get("selfieBase64") ?? "");
      const buf = bufferFromBase64(selfieB64);
      if (!buf) {
        return NextResponse.json(
          { error: "Selfie requis (fichier image)." },
          { status: 400 },
        );
      }
      selfiePath = path.join(userDir, "selfie.jpg");
      await writeFile(selfiePath, buf);
    }

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
