import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  createBankCustomer,
  getPartnerBankForStaffUser,
  listBankCustomers,
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

export async function GET() {
  const ctx = await requireBankStaff();
  if (!ctx) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const customers = await listBankCustomers(ctx.bank.id);
  return NextResponse.json(customers);
}

export async function POST(req: NextRequest) {
  const ctx = await requireBankStaff();
  if (!ctx) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  try {
    const body = (await req.json()) as {
      email?: string;
      password?: string;
      fullName?: string;
      accountNumber?: string;
      accountName?: string;
      currency?: Currency;
    };

    if (
      !body.email ||
      !body.password ||
      !body.fullName ||
      !body.accountNumber
    ) {
      return NextResponse.json(
        { error: "Champs obligatoires manquants" },
        { status: 400 },
      );
    }

    const customer = await createBankCustomer({
      partnerBankId: ctx.bank.id,
      email: body.email,
      password: body.password,
      fullName: body.fullName,
      accountNumber: body.accountNumber,
      accountName: body.accountName || body.fullName,
      currency: body.currency === "USD" ? "USD" : "CDF",
    });

    return NextResponse.json(
      {
        id: customer.id,
        email: customer.email,
        fullName: customer.fullName,
        accountNumber: customer.accountNumber,
        accountName: customer.accountName,
        currency: customer.currency,
        isActive: customer.isActive,
        createdAt: customer.createdAt,
      },
      { status: 201 },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur";
    const status = message.includes("Unique") || message.includes("déjà")
      ? 409
      : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
