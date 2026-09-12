import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { notifyBankPayment } from "@/modules/banks/bank-payment.service";

const bodySchema = z.object({
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
  token: z.string().min(16),
  notify_ref: z.string().optional(),
  channel: z.enum(["BANK_TRANSFER", "MOBILE_MONEY"]).optional(),
});

/**
 * Webhook banque → ekonzo : notification de paiement réussi.
 * Authentifié par client_id / client_secret OAuth de la banque.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ bankCode: string }> },
) {
  const { bankCode } = await ctx.params;
  const body = bodySchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json(
      { error: "Données invalides", details: body.error.flatten() },
      { status: 400 },
    );
  }

  const result = await notifyBankPayment({
    bankCode,
    clientId: body.data.client_id,
    clientSecret: body.data.client_secret,
    token: body.data.token,
    notifyRef: body.data.notify_ref,
    channel: body.data.channel,
  });

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
    notifyRef: "notifyRef" in result ? result.notifyRef : undefined,
    returnUrl: "returnUrl" in result ? result.returnUrl : undefined,
  });
}
