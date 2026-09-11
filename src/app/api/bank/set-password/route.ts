import { NextRequest, NextResponse } from "next/server";
import { activateBankPassword } from "@/modules/banks/bank.service";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Token manquant" }, { status: 400 });
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const invite = await prisma.bankInviteToken.findUnique({
    where: { token: tokenHash },
    include: {
      bank: { select: { name: true, shortName: true, email: true, logoUrl: true } },
    },
  });

  if (!invite || invite.usedAt) {
    return NextResponse.json(
      { error: "Lien invalide ou déjà utilisé" },
      { status: 400 },
    );
  }
  if (invite.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "Lien expiré" }, { status: 400 });
  }

  return NextResponse.json({
    email: invite.bank.email,
    bankName: invite.bank.name,
    shortName: invite.bank.shortName,
    logoUrl: invite.bank.logoUrl,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { token?: string; password?: string };
    if (!body.token || !body.password) {
      return NextResponse.json(
        { error: "Token et mot de passe requis" },
        { status: 400 },
      );
    }

    const result = await activateBankPassword(body.token, body.password);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur serveur";
    const status = message.includes("expiré") || message.includes("invalide")
      ? 400
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
