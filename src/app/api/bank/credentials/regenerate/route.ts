import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  getBankByUserId,
  regenerateBankOAuthCredentials,
} from "@/modules/banks/bank.service";

/**
 * POST /api/bank/credentials/regenerate
 * Régénère client_id / client_secret pour la banque connectée.
 */
export async function POST() {
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
    return NextResponse.json({ error: "Banque introuvable" }, { status: 404 });
  }

  const updated = await regenerateBankOAuthCredentials(bank.id);
  return NextResponse.json({
    oauthClientId: updated.oauthClientId,
    oauthClientSecret: updated.oauthClientSecret,
    bankCode: updated.code,
  });
}
