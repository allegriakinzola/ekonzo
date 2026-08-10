import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { buildCifWorkbook } from "@/modules/cif/cif.service";

export const runtime = "nodejs";

/** GET /api/admin/cif/export — Excel CIF de tous les clients (ou ?userId=). */
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role ?? "CLIENT";
  if (!["ADMIN", "SUPER_ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const userId = req.nextUrl.searchParams.get("userId") ?? undefined;

  try {
    const { buffer, filename, count } = await buildCifWorkbook(userId);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
        "X-CIF-Count": String(count),
      },
    });
  } catch (e) {
    console.error("[CIF export]", e);
    return NextResponse.json(
      { error: "Échec de la génération du CIF" },
      { status: 500 },
    );
  }
}
