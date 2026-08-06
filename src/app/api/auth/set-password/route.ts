import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { password } = await req.json() as { password: string };
  if (!password || password.length < 8) {
    return NextResponse.json(
      { error: "Le mot de passe doit contenir au moins 8 caractères" },
      { status: 400 }
    );
  }

  const hashed = await hash(password, 12);

  const existing = await prisma.account.findFirst({
    where: { userId: session.user.id, providerId: "credential" },
  });

  if (existing) {
    await prisma.account.update({
      where: { id: existing.id },
      data: { password: hashed, updatedAt: new Date() },
    });
  } else {
    await prisma.account.create({
      data: {
        userId: session.user.id,
        providerId: "credential",
        accountId: session.user.id,
        password: hashed,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  return NextResponse.json({ success: true });
}
