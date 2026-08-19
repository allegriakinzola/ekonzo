/**
 * Compresse une image côté navigateur (canvas) pour rester sous la limite
 * body Vercel (~4,5 Mo) et accélérer Textract/Rekognition.
 */
export async function compressImageForUpload(
  file: File,
  opts: { maxEdge?: number; quality?: number; maxBytes?: number } = {},
): Promise<File> {
  const maxEdge = opts.maxEdge ?? 1600;
  const quality = opts.quality ?? 0.72;
  const maxBytes = opts.maxBytes ?? 2.5 * 1024 * 1024;

  if (!file.type.startsWith("image/")) {
    throw new Error(
      "Format non supporté. Utilisez une photo JPEG ou PNG (pas HEIC/PDF).",
    );
  }

  // Déjà assez petit — pas de retraitement inutile
  if (file.size <= maxBytes && file.size <= 1.2 * 1024 * 1024) {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let q = quality;
  let blob: Blob | null = null;
  for (let i = 0; i < 4; i++) {
    blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", q),
    );
    if (blob && blob.size <= maxBytes) break;
    q -= 0.12;
  }

  if (!blob) return file;

  const name = file.name.replace(/\.\w+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
}

/** Lit le JSON d'une Response sans planter sur corps vide (413 / crash serverless). */
export async function readJsonResponse<T = Record<string, unknown>>(
  res: Response,
): Promise<T> {
  const text = await res.text();
  if (!text) {
    if (res.status === 413) {
      throw new Error(
        "Photo trop volumineuse pour le serveur. Reprenez une photo plus légère ou rapprochez-vous du document.",
      );
    }
    throw new Error(
      `Le serveur n'a pas répondu correctement (HTTP ${res.status}). Réessayez avec une photo plus petite.`,
    );
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      `Réponse serveur invalide (HTTP ${res.status}). Réessayez dans un instant.`,
    );
  }
}
