import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { startBankLink } from "@/modules/banks/bank-link.service";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const role = (session.user as { role?: string }).role;
  if (role !== "CLIENT") {
    return NextResponse.json({ error: "Réservé aux clients" }, { status: 403 });
  }

  try {
    const body = (await req.json()) as { partnerBankId?: string };
    if (!body.partnerBankId) {
      return NextResponse.json(
        { error: "partnerBankId requis" },
        { status: 400 },
      );
    }
    const result = await startBankLink(session.user.id, body.partnerBankId);
    return NextResponse.json({
      authorizeUrl: result.authorizeUrl,
      state: result.state,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 400 },
    );
  }
}
