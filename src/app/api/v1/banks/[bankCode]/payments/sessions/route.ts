import { NextRequest, NextResponse } from "next/server";
import {
  getPaymentSessionByRawToken,
} from "@/modules/banks/bank-payment.service";
import { ensureBankOAuthCredentials } from "@/modules/banks/bank-link.service";

/**
 * GET /api/v1/banks/{code}/payments/sessions?token=
 * Détail session pour banques EXTERNAL (auth client_id / client_secret).
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ bankCode: string }> },
) {
  const { bankCode } = await ctx.params;
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const clientId =
    req.headers.get("x-client-id") ??
    req.nextUrl.searchParams.get("client_id") ??
    "";
  const clientSecret =
    req.headers.get("x-client-secret") ??
    req.nextUrl.searchParams.get("client_secret") ??
    "";

  if (!token || token.length < 16) {
    return NextResponse.json({ error: "token requis" }, { status: 400 });
  }

  const session = await getPaymentSessionByRawToken(token);
  if (!session) {
    return NextResponse.json(
      {
        error:
          "Session introuvable. Relancez le paiement depuis ekonzo (le lien expire ou est remplacé à chaque nouvel essai).",
      },
      { status: 404 },
    );
  }
  if (session.partnerBank.code.toUpperCase() !== bankCode.toUpperCase()) {
    return NextResponse.json(
      {
        error: `Session liée à la banque ${session.partnerBank.code}, pas ${bankCode.toUpperCase()}. Vérifiez EKONZO_BANK_CODE côté portail bancaire.`,
      },
      { status: 404 },
    );
  }

  const bank = await ensureBankOAuthCredentials(session.partnerBankId);
  if (
    !clientId ||
    !clientSecret ||
    clientId !== bank.oauthClientId ||
    clientSecret !== bank.oauthClientSecret
  ) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  return NextResponse.json({
    token,
    status: session.status,
    amount: Number(session.amount),
    currency: session.currency,
    productLabel: session.productLabel,
    instrumentKind: session.instrumentKind,
    accountNumber: session.accountNumber,
    accountName: session.accountName,
    returnUrl: session.returnUrl,
    expiresAt: session.expiresAt.toISOString(),
    bank: {
      code: bank.code,
      shortName: bank.shortName,
      name: bank.name,
    },
  });
}
