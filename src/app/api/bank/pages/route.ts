import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  getBankByUserId,
  updatePartnerBankPages,
} from "@/modules/banks/bank.service";

/** PATCH /api/bank/pages — la banque met à jour ses URLs de pages. */
export async function PATCH(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const role = (session.user as { role?: string }).role ?? "";
  if (role !== "BANK") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const bank = await getBankByUserId(session.user.id);
  if (!bank) {
    return NextResponse.json(
      { error: "Aucune banque associée" },
      { status: 404 },
    );
  }

  try {
    const body = (await req.json()) as {
      authorizeUrl?: string;
      tokenUrl?: string;
      userinfoUrl?: string;
      paymentUrl?: string;
    };

    const updated = await updatePartnerBankPages(bank.id, {
      authorizeUrl: String(body.authorizeUrl ?? ""),
      tokenUrl: String(body.tokenUrl ?? ""),
      userinfoUrl: String(body.userinfoUrl ?? ""),
      paymentUrl: String(body.paymentUrl ?? ""),
    });

    return NextResponse.json({
      authorizeUrl: updated.authorizeUrl,
      tokenUrl: updated.tokenUrl,
      userinfoUrl: updated.userinfoUrl,
      paymentUrl: updated.paymentUrl,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur";
    const status =
      message.includes("requis") ||
      message.includes("invalide") ||
      message.includes("http")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
