import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { readFile } from "fs/promises";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getConventionUploadDir,
  getUserActiveAgreement,
} from "@/modules/convention/convention.service";
import { resolveConventionFile } from "@/modules/cif/cif.service";

export const runtime = "nodejs";

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const role = (session.user as { role?: string }).role ?? "CLIENT";
  if (!["ADMIN", "SUPER_ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  return null;
}

/** GET — PDF de convention signée d'un client (admin). */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { userId } = await params;
  const { agreement } = await getUserActiveAgreement(userId);
  if (!agreement) {
    return NextResponse.json(
      { error: "Aucune convention signée pour ce client" },
      { status: 404 },
    );
  }

  const uploadDir = getConventionUploadDir();
  const absolute = resolveConventionFile(uploadDir, agreement.pdfPath);
  if (!absolute) {
    return NextResponse.json({ error: "Chemin invalide" }, { status: 400 });
  }

  try {
    const buffer = await readFile(absolute);
    const convention = await prisma.securitiesAccountConvention.findUnique({
      where: { id: agreement.conventionId },
      select: { version: true },
    });
    const filename = `CIF-convention-${userId.slice(0, 8)}-v${convention?.version ?? "x"}.pdf`;
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
