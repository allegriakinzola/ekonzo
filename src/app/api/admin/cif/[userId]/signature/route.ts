import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  getUserActiveAgreement,
  readAgreementSignatureBuffer,
} from "@/modules/convention/convention.service";

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
  if (!agreement?.signatureImagePath && !agreement?.signatureImageBase64) {
    return NextResponse.json(
      { error: "Aucune image de signature pour ce client" },
      { status: 404 },
    );
  }

  try {
    const buffer = await readAgreementSignatureBuffer(agreement);
    if (!buffer) {
      return NextResponse.json(
        { error: "Aucune image de signature pour ce client" },
        { status: 404 },
      );
    }
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="CIF-signature-${userId.slice(0, 8)}.png"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("[admin cif signature]", err);
    return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
  }
}
