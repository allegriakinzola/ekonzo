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

const createSchema = z
  .object({
    code: z.string().min(2).max(20),
    type: z.enum(["BT", "OT"]).optional(),
    currency: z.enum(["CDF", "USD"]),
    /** @deprecated conservé pour compat DB — égalé au ticket minimum si absent */
    faceValue: z.number().positive().optional(),
    minTicket: z.number().positive(),
    discountRate: z.number().min(0).max(1).optional(),
    couponRate: z.number().min(0).max(1).optional(),
    couponFrequency: z
      .enum(["MONTHLY", "QUARTERLY", "SEMI_ANNUAL", "ANNUAL", "AT_MATURITY"])
      .optional(),
    issuanceDate: z.string(),
    maturityDate: z.string(),
    adjudicationDate: z.string(),
    subscriptionDeadline: z.string(),
    totalVolume: z.number().positive(),
  })
  .refine((d) => d.minTicket <= d.totalVolume, {
    message: "Le ticket minimum ne peut pas dépasser le montant total annoncé",
    path: ["minTicket"],
  });

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const products = await prisma.product.findMany({
    where: status ? { status: status as never } : undefined,
    include: { _count: { select: { subscriptions: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const body = createSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "Données invalides", details: body.error.flatten() }, { status: 400 });
  }

  const d = body.data;
  // Modèle grand public : montant libre ≥ ticket mini. faceValue = minTicket (compat schéma).
  const faceValue = d.faceValue ?? d.minTicket;
  const product = await prisma.product.create({
    data: {
      code: d.code.toUpperCase(),
      type: d.type ?? "BT",
      currency: d.currency,
      faceValue,
      minTicket: d.minTicket,
      discountRate: d.discountRate,
      couponRate: d.couponRate,
      couponFrequency: d.couponFrequency,
      issuanceDate: new Date(d.issuanceDate),
      maturityDate: new Date(d.maturityDate),
      adjudicationDate: new Date(d.adjudicationDate),
      subscriptionDeadline: new Date(d.subscriptionDeadline),
      totalVolume: d.totalVolume,
      status: "OPEN",
    },
  });

  return NextResponse.json(product, { status: 201 });
}
