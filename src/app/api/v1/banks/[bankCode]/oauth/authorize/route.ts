import { NextRequest, NextResponse } from "next/server";
import { resolveAuthorizeRequest } from "@/modules/banks/bank-link.service";

/**
 * OAuth authorize — redirige vers l'écran de login banque (IdP simulé).
 * Contrat d'interopérabilité fourni aux banques partenaires.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bankCode: string }> },
) {
  const { bankCode } = await params;
  const q = req.nextUrl.searchParams;

  try {
    await resolveAuthorizeRequest(bankCode, {
      client_id: q.get("client_id") ?? undefined,
      redirect_uri: q.get("redirect_uri") ?? undefined,
      state: q.get("state") ?? undefined,
      response_type: q.get("response_type") ?? undefined,
    });

    const login = new URL(
      `/idp/${bankCode.toUpperCase()}/login`,
      req.nextUrl.origin,
    );
    login.searchParams.set("client_id", q.get("client_id")!);
    login.searchParams.set("redirect_uri", q.get("redirect_uri")!);
    login.searchParams.set("state", q.get("state")!);
    return NextResponse.redirect(login);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 400 },
    );
  }
}
