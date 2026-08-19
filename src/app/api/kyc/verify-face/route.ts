import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, readdir } from "fs/promises";
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

/**
 * POST /api/kyc/verify-face
 * Étape 2 : selfie + (re)upload éventuel du recto — obligatoire sur Vercel
 * car /tmp de l'étape 1 n'est pas garanti sur une autre instance.
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

    const selfie = formData.get("selfie") as File | null;
    const docFront = formData.get("docFront") as File | null;
    const docType = formData.get("docType") as KycDocType;
    const firstName = (formData.get("firstName") as string)?.trim();
    const lastName = (formData.get("lastName") as string)?.trim();
    const postName = (formData.get("postName") as string)?.trim() || undefined;
    const dateOfBirth =
      (formData.get("dateOfBirth") as string)?.trim() || undefined;
    const docNumber =
      (formData.get("docNumber") as string)?.trim() || undefined;
    const address = (formData.get("address") as string)?.trim() || undefined;

    if (!selfie || !docType || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Selfie, type de document, nom et prénom requis" },
        { status: 400 },
      );
    }
    if (selfie.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Selfie trop volumineux (max 5 Mo)" },
        { status: 400 },
      );
    }
    if (selfie.type && !ALLOWED_TYPES.includes(selfie.type.toLowerCase())) {
      return NextResponse.json(
        { error: `Format selfie non supporté : ${selfie.type}` },
        { status: 400 },
      );
    }

    const userDir = getKycUserDir(userId);
    await mkdir(userDir, { recursive: true });

    let docFrontPath: string;

    if (docFront && docFront.size > 0) {
      if (docFront.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: "Document trop volumineux (max 5 Mo)" },
          { status: 400 },
        );
      }
      const rawExt = docFront.name.split(".").pop()?.toLowerCase() || "jpg";
      const ext = ["jpg", "jpeg", "png", "webp"].includes(rawExt)
        ? rawExt
        : "jpg";
      docFrontPath = path.join(userDir, `doc_front.${ext}`);
      await writeFile(
        docFrontPath,
        Buffer.from(await docFront.arrayBuffer()),
      );
    } else {
      try {
        const files = await readdir(userDir);
        const docFile = files.find((f) => f.startsWith("doc_front."));
        if (!docFile) throw new Error("no doc");
        docFrontPath = path.join(userDir, docFile);
      } catch {
        return NextResponse.json(
          {
            error:
              "Document introuvable — recommencez l'étape d'upload du document",
          },
          { status: 400 },
        );
      }
    }

    const selfieExt = selfie.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeSelfieExt = ["jpg", "jpeg", "png", "webp"].includes(selfieExt)
      ? selfieExt
      : "jpg";
    const selfiePath = path.join(userDir, `selfie.${safeSelfieExt}`);
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
