import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { signActiveConvention } from "@/modules/convention/convention.service";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    signedName: z.string().trim().min(3).max(120),
    partnerBankCode: z.string().trim().min(2).max(64),
    accepted: z.literal(true),
    signatureMethod: z.enum(["TYPED", "DRAWN"]),
    signatureImageDataUrl: z.string().optional().nullable(),
  })
  .superRefine((val, ctx) => {
    if (val.signatureMethod === "DRAWN") {
      if (
        !val.signatureImageDataUrl ||
        !val.signatureImageDataUrl.startsWith("data:image/png;base64,")
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["signatureImageDataUrl"],
          message: "Signature manuscrite requise",
        });
      }
    }
  });

/** POST — accepter et signer électroniquement la convention active. */
export async function POST(req: NextRequest) {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { phoneNumber: true },
  });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Données invalides",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const result = await signActiveConvention({
      userId: session.user.id,
      signedName: parsed.data.signedName,
      partnerBankCode: parsed.data.partnerBankCode,
      signatureMethod: parsed.data.signatureMethod,
      signatureImageDataUrl: parsed.data.signatureImageDataUrl,
      userPhone: user?.phoneNumber,
      ipAddress:
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        null,
      userAgent: req.headers.get("user-agent"),
    });

    return NextResponse.json({
      ok: true,
      alreadySigned: result.alreadySigned,
      agreementId: result.agreement.id,
      signedAt: result.agreement.signedAt,
      partnerBankCode: result.agreement.partnerBankCode,
      partnerBankName: result.agreement.partnerBankName,
      pdfUrl: `/api/convention/pdf`,
    });
  } catch (e) {
    console.error("[convention/sign]", e);
    const message = e instanceof Error ? e.message : "Erreur de signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
