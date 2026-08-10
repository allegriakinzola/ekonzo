import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  getSettlementProfile,
  upsertSettlementProfile,
} from "@/modules/settlement/settlement.service";

export const runtime = "nodejs";

const bodySchema = z.object({
  preferredChannel: z.enum(["MOBILE_MONEY", "BANK_TRANSFER"]),
  momoPhone: z.string().trim().max(20).optional().nullable(),
  bankName: z.string().trim().max(120).optional().nullable(),
  bankAccountNumber: z.string().trim().max(64).optional().nullable(),
  bankAccountName: z.string().trim().max(120).optional().nullable(),
});

/** GET — profil de règlement de l'utilisateur connecté. */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const profile = await getSettlementProfile(session.user.id);
  return NextResponse.json({ profile });
}

/** PUT — créer / mettre à jour le profil de règlement. */
export async function PUT(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const profile = await upsertSettlementProfile(
      session.user.id,
      parsed.data,
      { userName: session.user.name },
    );
    return NextResponse.json({ ok: true, profile });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erreur d'enregistrement";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
