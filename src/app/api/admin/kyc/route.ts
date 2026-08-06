import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string })?.role ?? "";
  if (!session || !["ADMIN", "SUPER_ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "SUBMITTED";

  const kycs = await prisma.kYC.findMany({
    where: { status: status as "PENDING" | "SUBMITTED" | "VERIFIED" | "REJECTED" },
    include: {
      user: { select: { id: true, name: true, phoneNumber: true, createdAt: true } },
    },
    orderBy: { updatedAt: "asc" },
  });

  return NextResponse.json(kycs);
}
