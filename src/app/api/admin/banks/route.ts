import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  createPartnerBank,
  listPartnerBanks,
} from "@/modules/banks/bank.service";

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string })?.role ?? "";
  if (!session || !["ADMIN", "SUPER_ADMIN"].includes(role)) return null;
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const banks = await listPartnerBanks();
  return NextResponse.json(banks);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  try {
    const form = await req.formData();
    const name = String(form.get("name") ?? "").trim();
    const shortName = String(form.get("shortName") ?? "").trim();
    const code = String(form.get("code") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const logo = form.get("logo");

    if (!name || !shortName || !email) {
      return NextResponse.json(
        { error: "Nom, sigle et e-mail sont requis" },
        { status: 400 },
      );
    }

    const logoFile =
      logo instanceof File && logo.size > 0 ? logo : null;

    if (logoFile && logoFile.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Logo trop volumineux (max 2 Mo)" },
        { status: 400 },
      );
    }

    const bank = await createPartnerBank({
      name,
      shortName,
      code: code || shortName,
      email,
      logoFile,
    });

    return NextResponse.json(bank, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur serveur";
    const status =
      message.includes("déjà") || message.includes("invalide") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
