import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string })?.role ?? "";
  if (!session || !["ADMIN", "SUPER_ADMIN"].includes(role)) return null;
  return session;
}

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("confirm_payment") }),
  z.object({ action: z.literal("submit") }),
  z.object({
    action: z.literal("adjudicate"),
    adjudicatedAmount: z.number().positive(),
    adjudicatedRate: z.number().min(0).max(1),
  }),
  z.object({ action: z.literal("cancel"), reason: z.string().optional() }),
]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;
  const body = patchSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  const sub = await prisma.subscription.findUnique({ where: { id } });
  if (!sub) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  let updated;

  if (body.data.action === "confirm_payment") {
    updated = await prisma.subscription.update({
      where: { id },
      data: { status: "PAYMENT_CONFIRMED" },
    });
  } else if (body.data.action === "submit") {
    updated = await prisma.subscription.update({
      where: { id },
      data: { status: "SUBMITTED" },
    });
  } else if (body.data.action === "adjudicate") {
    const { adjudicatedAmount, adjudicatedRate } = body.data;
    updated = await prisma.$transaction(async (tx) => {
      const s = await tx.subscription.update({
        where: { id },
        data: {
          status: "ADJUDICATED",
          adjudicatedAmount,
          adjudicatedRate,
          adjudicatedAt: new Date(),
        },
      });
      await tx.product.update({
        where: { id: sub.productId },
        data: { allocatedVolume: { increment: adjudicatedAmount } },
      });
      return s;
    });
  } else if (body.data.action === "cancel") {
    updated = await prisma.subscription.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
  }

  return NextResponse.json(updated);
}
