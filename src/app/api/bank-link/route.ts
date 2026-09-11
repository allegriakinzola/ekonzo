import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  getActiveBankLink,
  listActivePartnerBanks,
} from "@/modules/banks/bank-link.service";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const [banks, link] = await Promise.all([
    listActivePartnerBanks(),
    getActiveBankLink(session.user.id),
  ]);

  return NextResponse.json({ banks, link });
}
