import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { confirmSimulatedBankPayment } from "@/modules/banks/bank-payment.service";

const bodySchema = z.object({
  token: z.string().min(16),
});

/** Confirmation paiement depuis l'UI banque simulée (/idp/[bankCode]/pay) */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ bankCode: string }> },
) {
  await ctx.params;
  const body = bodySchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "Jeton manquant" }, { status: 400 });
  }

  const result = await confirmSimulatedBankPayment(body.data.token);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({
    status: result.status,
    alreadyProcessed: result.alreadyProcessed ?? false,
    subscriptionId: result.subscriptionId,
    returnUrl: result.returnUrl,
    notifyRef: "notifyRef" in result ? result.notifyRef : undefined,
  });
}
