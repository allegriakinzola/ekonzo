/**
 * Compresse une image côté navigateur (canvas) pour rester sous la limite
 * body Vercel (~4,5 Mo) — selfie + recto partent ensemble à l'étape 2.
 */
export async function compressImageForUpload(
  file: File,
  opts: { maxEdge?: number; quality?: number; maxBytes?: number } = {},
): Promise<File> {
  const maxEdge = opts.maxEdge ?? 1280;
  const quality = opts.quality ?? 0.65;
  const maxBytes = opts.maxBytes ?? 900 * 1024; // ~0,9 Mo — 2 fichiers < 4,5 Mo

  if (!file.type.startsWith("image/") && file.type !== "") {
    throw new Error(
      "Format non supporté. Utilisez une photo JPEG ou PNG (pas HEIC/PDF).",
    );
  }

  // Déjà assez petit
  if (file.size <= maxBytes && file.type === "image/jpeg") {
    return file;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(
      "Impossible de lire cette image. Exportez-la en JPEG et réessayez.",
    );
  }

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
  for (let i = 0; i < 6; i++) {
    blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", q),
    );
    if (blob && blob.size <= maxBytes) break;
    q = Math.max(0.35, q - 0.08);
  }

  if (!blob || blob.size === 0) {
    throw new Error("Échec de la compression de la photo. Réessayez.");
  }

  const name = (file.name.replace(/\.\w+$/, "") || "photo") + ".jpg";
  return new File([blob], name, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

/** Lit le JSON d'une Response sans planter sur corps vide (413 / crash serverless). */
export async function readJsonResponse<T = Record<string, unknown>>(
  res: Response,
): Promise<T> {
  const text = await res.text();
  if (!text) {
    if (res.status === 413) {
      throw new Error(
        "Photos trop volumineuses pour le serveur. Reprenez des clichés plus légers.",
      );
    }
    throw new Error(
      `Le serveur n'a pas répondu correctement (HTTP ${res.status}). Réessayez avec des photos plus petites.`,
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
