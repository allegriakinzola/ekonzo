import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { readFile } from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getConventionUploadDir,
  getUserActiveAgreement,
} from "@/modules/convention/convention.service";

export const runtime = "nodejs";

/** GET — télécharger le PDF signé de la convention active. */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role ?? "CLIENT";
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(role);

  const { agreement } = await getUserActiveAgreement(session.user.id);
  if (!agreement) {
    // Admin peut demander un autre user via ?userId= — non exposé pour l'instant
    if (isAdmin) {
      return NextResponse.json(
        { error: "Aucune convention signée pour cet utilisateur" },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: "Convention non signée" },
      { status: 404 },
    );
  }

  // Sécurité propriétaire
  if (!isAdmin && agreement.userId !== session.user.id) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const uploadDir = getConventionUploadDir();
  const absolute = path.join(uploadDir, agreement.pdfPath);
  if (!absolute.startsWith(uploadDir)) {
    return NextResponse.json({ error: "Chemin invalide" }, { status: 400 });
  }

  try {
    const buffer = await readFile(absolute);
    const convention = await prisma.securitiesAccountConvention.findUnique({
      where: { id: agreement.conventionId },
      select: { version: true },
    });
    const filename = `convention-compte-titres-v${convention?.version ?? "x"}.pdf`;
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
        "X-Content-SHA256": agreement.pdfSha256,
      },
    });
  } catch {
    return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
  }
}
