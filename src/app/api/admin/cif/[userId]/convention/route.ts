import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getUserActiveAgreement,
  readAgreementPdfBuffer,
} from "@/modules/convention/convention.service";

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

  try {
    const buffer = await readAgreementPdfBuffer(agreement);
    const convention = await prisma.securitiesAccountConvention.findUnique({
      where: { id: agreement.conventionId },
      select: { version: true },
    });
    const filename = `CIF-convention-${userId.slice(0, 8)}-v${convention?.version ?? "x"}.pdf`;
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
        "X-Content-SHA256": agreement.pdfSha256,
      },
    });
  } catch (err) {
    console.error("[admin cif convention]", err);
    return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
  }
}
