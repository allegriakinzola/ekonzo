import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { readFile } from "fs/promises";
import { auth } from "@/lib/auth";
import {
  getConventionUploadDir,
  getUserActiveAgreement,
} from "@/modules/convention/convention.service";
import { resolveConventionFile } from "@/modules/cif/cif.service";

export const runtime = "nodejs";

/** GET — image de signature manuscrite d'un client (admin). */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const role = (session.user as { role?: string }).role ?? "CLIENT";
  if (!["ADMIN", "SUPER_ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { userId } = await params;
  const { agreement } = await getUserActiveAgreement(userId);
  if (!agreement?.signatureImagePath) {
    return NextResponse.json(
      { error: "Aucune image de signature pour ce client" },
      { status: 404 },
    );
  }

  const uploadDir = getConventionUploadDir();
  const absolute = resolveConventionFile(uploadDir, agreement.signatureImagePath);
  if (!absolute) {
    return NextResponse.json({ error: "Chemin invalide" }, { status: 400 });
  }

  try {
    const buffer = await readFile(absolute);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="CIF-signature-${userId.slice(0, 8)}.png"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
  }
}
