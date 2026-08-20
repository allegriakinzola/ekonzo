import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  getUserActiveAgreement,
  regenerateAgreementPdf,
} from "@/modules/convention/convention.service";

export const runtime = "nodejs";

/** GET — télécharger le PDF signé (régénéré avec le modèle actuel). */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role ?? "CLIENT";
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(role);

  const { agreement, convention } = await getUserActiveAgreement(
    session.user.id,
  );
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
    const buffer = await regenerateAgreementPdf(agreement);
    const filename = `convention-compte-titres-v${convention.version}.pdf`;
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("[convention/pdf]", err);
    return NextResponse.json(
      { error: "Impossible de générer le PDF" },
      { status: 500 },
    );
  }
}
