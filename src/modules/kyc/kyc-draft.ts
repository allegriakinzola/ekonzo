import { prisma } from "@/lib/prisma";

/** Persiste le recto entre /extract et /verify-face (DB, pas /tmp Vercel). */
export async function saveKycDocDraft(
  userId: string,
  buffer: Buffer,
  mime = "image/jpeg",
) {
  const docBase64 = buffer.toString("base64");
  await prisma.kycDraft.upsert({
    where: { userId },
    create: { userId, docMime: mime, docBase64 },
    update: { docMime: mime, docBase64 },
  });
}

export async function loadKycDocDraft(userId: string) {
  const draft = await prisma.kycDraft.findUnique({ where: { userId } });
  if (!draft?.docBase64) return null;
  return {
    buffer: Buffer.from(draft.docBase64, "base64"),
    mime: draft.docMime || "image/jpeg",
  };
}

export async function clearKycDocDraft(userId: string) {
  await prisma.kycDraft.deleteMany({ where: { userId } });
}
