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
    const password = String(form.get("password") ?? "");
    const logo = form.get("logo");

    if (!name || !shortName || !email || !password) {
      return NextResponse.json(
        { error: "Nom, sigle, e-mail et mot de passe sont requis" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Mot de passe : 8 caractères minimum" },
        { status: 400 },
      );
    }

    const logoFile =
      logo instanceof File && logo.size > 0 ? logo : null;

    if (logoFile && logoFile.size > 512 * 1024) {
      return NextResponse.json(
        { error: "Logo trop volumineux (maximum 512 Ko)" },
        { status: 400 },
      );
    }

    const bank = await createPartnerBank({
      name,
      shortName,
      code: code || shortName,
      email,
      password,
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
