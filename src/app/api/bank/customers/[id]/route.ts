import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  deleteBankCustomer,
  getPartnerBankForStaffUser,
  updateBankCustomer,
} from "@/modules/banks/bank-link.service";
import type { Currency } from "@prisma/client";

async function requireBankStaff() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const role = (session.user as { role?: string }).role;
  if (role !== "BANK") return null;
  const bank = await getPartnerBankForStaffUser(session.user.id);
  if (!bank) return null;
  return { session, bank };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireBankStaff();
  if (!ctx) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const body = (await req.json()) as {
      fullName?: string;
      accountNumber?: string;
      accountName?: string;
      currency?: Currency;
      isActive?: boolean;
      password?: string;
    };
    const updated = await updateBankCustomer(ctx.bank.id, id, body);
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireBankStaff();
  if (!ctx) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id } = await params;
  try {
    await deleteBankCustomer(ctx.bank.id, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 400 },
    );
  }
}
