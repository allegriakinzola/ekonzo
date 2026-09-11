import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  pollMomoPaymentForSession,
  startMomoPaymentForSession,
} from "@/modules/banks/bank-payment.service";

const initSchema = z.object({
  token: z.string().min(16),
  phone: z.string().min(8),
});

/**
 * POST — la banque (simulée) déclenche le paiement Mobile Money via son agrégateur.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ bankCode: string }> },
) {
  await ctx.params;
  const body = initSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json(
      { error: "Numéro ou jeton invalide" },
      { status: 400 },
    );
  }

  const result = await startMomoPaymentForSession({
    rawToken: body.data.token,
    phone: body.data.phone,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({
    status: "PENDING",
    phone: result.phone,
    orderRef: result.orderRef,
    providerRef: result.providerRef,
  });
}

/**
 * GET ?token= — polling du statut agrégateur ; en SUCCESS, ekonzo est notifié.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ bankCode: string }> },
) {
  await ctx.params;
  const token = req.nextUrl.searchParams.get("token") ?? "";
  if (token.length < 16) {
    return NextResponse.json({ error: "Jeton manquant" }, { status: 400 });
  }

  const result = await pollMomoPaymentForSession(token);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({
    status: result.status,
    returnUrl: result.returnUrl,
    error: result.error,
  });
}
