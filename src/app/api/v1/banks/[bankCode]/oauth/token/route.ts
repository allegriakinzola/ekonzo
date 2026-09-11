import { NextRequest, NextResponse } from "next/server";
import { exchangeAuthorizationCode } from "@/modules/banks/bank-link.service";

/**
 * OAuth token — échange authorization_code → access_token
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ bankCode: string }> },
) {
  const { bankCode } = await params;
  try {
    const body = await req.json();
    const token = await exchangeAuthorizationCode(bankCode, body);
    return NextResponse.json(token);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 400 },
    );
  }
}
