import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

/** Chaîne opaque (base64url) — illisible, adaptée aux secrets d'intégration. */
export function opaqueSecret(byteLength: number) {
  return randomBytes(byteLength)
    .toString("base64url")
    .replace(/=+$/, "");
}

/**
 * Génère un couple client_id / client_secret unique par banque.
 * Jamais saisi à la main — uniquement généré côté serveur.
 */
export async function generateBankOAuthCredentials() {
  for (let attempt = 0; attempt < 8; attempt++) {
    const oauthClientId = `ekz_${opaqueSecret(24)}`;
    const oauthClientSecret = opaqueSecret(48);
    const clash = await prisma.partnerBank.findFirst({
      where: { oauthClientId },
      select: { id: true },
    });
    if (!clash) return { oauthClientId, oauthClientSecret };
  }
  throw new Error("Impossible de générer des identifiants OAuth uniques");
}
