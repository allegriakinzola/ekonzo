import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getUserActiveAgreement,
  readAgreementPdfBuffer,
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

  if (!isAdmin && agreement.userId !== session.user.id) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  try {
    const buffer = await readAgreementPdfBuffer(agreement);
    const convention = await prisma.securitiesAccountConvention.findUnique({
      where: { id: agreement.conventionId },
      select: { version: true },
    });
    const filename = `convention-compte-titres-v${convention?.version ?? "x"}.pdf`;
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
        "X-Content-SHA256": agreement.pdfSha256,
      },
    });
  } catch (err) {
    console.error("[convention/pdf]", err);
    return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
  }
}
