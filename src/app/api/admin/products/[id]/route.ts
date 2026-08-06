import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string })?.role ?? "";
  if (!session || !["ADMIN", "SUPER_ADMIN"].includes(role)) return null;
  return session;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;
  const { status } = await req.json() as { status: string };

  const ALLOWED = ["DRAFT", "OPEN", "CLOSED", "ADJUDICATED", "ACTIVE", "MATURED"];
  if (!ALLOWED.includes(status)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }

  const product = await prisma.product.update({
    where: { id },
    data: { status: status as never },
  });

  return NextResponse.json(product);
}
