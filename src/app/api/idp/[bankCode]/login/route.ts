import { NextRequest, NextResponse } from "next/server";
import { authenticateBankCustomerAndIssueCode } from "@/modules/banks/bank-link.service";

/** Login IdP simulé — émet le code OAuth et renvoie l'URL de callback */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ bankCode: string }> },
) {
  const { bankCode } = await params;
  try {
    const body = (await req.json()) as {
      state?: string;
      email?: string;
      password?: string;
    };
    if (!body.state || !body.email || !body.password) {
      return NextResponse.json(
        { error: "state, email et mot de passe requis" },
        { status: 400 },
      );
    }

    const result = await authenticateBankCustomerAndIssueCode({
      bankCode,
      state: body.state,
      email: body.email,
      password: body.password,
    });

    return NextResponse.json({ redirectUrl: result.redirectUrl });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 401 },
    );
  }
}
