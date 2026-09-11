import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { completeBankLinkCallback } from "@/modules/banks/bank-link.service";

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
    const body = (await req.json()) as { code?: string; state?: string };
    if (!body.code || !body.state) {
      return NextResponse.json(
        { error: "code et state requis" },
        { status: 400 },
      );
    }
    const link = await completeBankLinkCallback({
      userId: session.user.id,
      code: body.code,
      state: body.state,
    });
    return NextResponse.json(link);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 400 },
    );
  }
}
