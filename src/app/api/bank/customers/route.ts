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
      nom?: string;
      postnom?: string;
      prenom?: string;
      fullName?: string;
      accountNumber?: string;
      accountName?: string;
      currency?: Currency;
    };

    // Compat : ancien fullName → découpé naïvement si besoin
    let nom = (body.nom ?? "").trim();
    let postnom = (body.postnom ?? "").trim();
    let prenom = (body.prenom ?? "").trim();
    if ((!nom || !prenom) && body.fullName) {
      const parts = body.fullName.trim().split(/\s+/);
      nom = nom || parts[0] || "";
      prenom = prenom || parts[parts.length - 1] || "";
      if (!postnom && parts.length > 2) {
        postnom = parts.slice(1, -1).join(" ");
      }
    }

    if (!body.email || !body.password || !nom || !prenom || !body.accountNumber) {
      return NextResponse.json(
        { error: "Champs obligatoires manquants (nom, prénom, e-mail, compte)" },
        { status: 400 },
      );
    }

    const customer = await createBankCustomer({
      partnerBankId: ctx.bank.id,
      email: body.email,
      password: body.password,
      nom,
      postnom,
      prenom,
      accountNumber: body.accountNumber,
      accountName: body.accountName || "",
      currency: body.currency === "USD" ? "USD" : "CDF",
    });

    return NextResponse.json(
      {
        id: customer.id,
        email: customer.email,
        nom: customer.nom,
        postnom: customer.postnom,
        prenom: customer.prenom,
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
