import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { KYCStatus } from "@prisma/client";

const VALID_STATUSES: KYCStatus[] = [
  "PENDING",
  "SUBMITTED",
  "UNDER_REVIEW",
  "VERIFIED",
  "REJECTED",
];

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string })?.role ?? "";
  if (!session || !["ADMIN", "SUPER_ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "ALL";

  const where =
    status === "ALL" || status === "SOUMIS"
      ? {
          // Tous les dossiers réellement envoyés (hors brouillon PENDING)
          status: { in: ["SUBMITTED", "UNDER_REVIEW", "VERIFIED", "REJECTED"] as KYCStatus[] },
        }
      : VALID_STATUSES.includes(status as KYCStatus)
        ? { status: status as KYCStatus }
        : {
            status: { in: ["SUBMITTED", "UNDER_REVIEW", "VERIFIED", "REJECTED"] as KYCStatus[] },
          };

  const kycs = await prisma.kYC.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, phoneNumber: true, createdAt: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(kycs);
}
