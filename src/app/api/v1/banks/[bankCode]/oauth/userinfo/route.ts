import { NextRequest, NextResponse } from "next/server";
import { getUserinfoFromAccessToken } from "@/modules/banks/bank-link.service";

/**
 * OAuth userinfo — profil client bancaire après authentification
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bankCode: string }> },
) {
  const { bankCode } = await params;
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : "";

  if (!token) {
    return NextResponse.json({ error: "Bearer token requis" }, { status: 401 });
  }

  try {
    const info = await getUserinfoFromAccessToken(bankCode, token);
    return NextResponse.json(info);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 401 },
    );
  }
}
