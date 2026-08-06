import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { approveKyc, rejectKyc } from "@/modules/kyc/kyc.service";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string })?.role ?? "";
  if (!session || !["ADMIN", "SUPER_ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id } = await params;
  const { action, reason } = await req.json() as { action: "approve" | "reject"; reason?: string };

  if (action === "approve") {
    const kyc = await approveKyc(id, session.user.id);
    return NextResponse.json(kyc);
  }

  if (action === "reject") {
    if (!reason) return NextResponse.json({ error: "Motif requis" }, { status: 400 });
    const kyc = await rejectKyc(id, session.user.id, reason);
    return NextResponse.json(kyc);
  }

  return NextResponse.json({ error: "Action invalide" }, { status: 400 });
}
