import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { buildProductCreateData } from "@/modules/products/product.model";

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string })?.role ?? "";
  if (!session || !["ADMIN", "SUPER_ADMIN"].includes(role)) return null;
  return session;
}

const createSchema = z
  .object({
    instrumentType: z.enum(["BTI", "BT_USD", "OTI", "OT_USD"]),
    isin: z.string().min(5).max(20),
    lineLabel: z.string().min(3).max(120),
    code: z.string().min(2).max(32).optional(),
    /** Pourcentage saisi (ex. 9 pour 9 %) — converti en fraction côté API */
    announcedRatePercent: z.number().min(0).max(100),
    totalVolume: z.number().positive(),
    issuanceDate: z.string(),
    maturityDate: z.string(),
    adjudicationDate: z.string(),
    subscriptionDeadline: z.string(),
    resultsDate: z.string().optional(),
    settlementDate: z.string().optional(),
    interestPeriodsPerYear: z.number().int().min(1).max(12).optional(),
    principalRepaymentMode: z
      .enum(["AT_MATURITY", "SEMI_ANNUAL", "ANNUAL"])
      .optional(),
    publish: z.boolean().optional(),
  })
  .superRefine((d, ctx) => {
    const isOt = d.instrumentType === "OTI" || d.instrumentType === "OT_USD";
    if (isOt && !d.interestPeriodsPerYear) {
      ctx.addIssue({
        code: "custom",
        message: "Périodes d'intérêts requises pour une obligation",
        path: ["interestPeriodsPerYear"],
      });
    }
    if (isOt && !d.principalRepaymentMode) {
      ctx.addIssue({
        code: "custom",
        message: "Modalité de remboursement requise pour une obligation",
        path: ["principalRepaymentMode"],
      });
    }
  });

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

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
  if (!session) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = createSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json(
      { error: "Données invalides", details: body.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const d = body.data;
    const isin = d.isin.trim().toUpperCase();
    const existingIsin = await prisma.product.findFirst({
      where: { isin },
    });
    if (existingIsin) {
      return NextResponse.json(
        { error: "Ce code ISIN existe déjà" },
        { status: 409 },
      );
    }

    const data = buildProductCreateData({
      instrumentType: d.instrumentType,
      isin,
      lineLabel: d.lineLabel,
      code: d.code,
      announcedRate: d.announcedRatePercent / 100,
      totalVolume: d.totalVolume,
      issuanceDate: d.issuanceDate,
      maturityDate: d.maturityDate,
      adjudicationDate: d.adjudicationDate,
      subscriptionDeadline: d.subscriptionDeadline,
      resultsDate: d.resultsDate,
      settlementDate: d.settlementDate,
      interestPeriodsPerYear: d.interestPeriodsPerYear,
      principalRepaymentMode: d.principalRepaymentMode,
      publish: d.publish,
    });

    const product = await prisma.product.create({ data });
    return NextResponse.json(product, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
