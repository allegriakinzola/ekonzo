import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { sendBankInvite, saveBankLogo } from "@/modules/banks/bank.service";

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string })?.role ?? "";
  if (!session || !["ADMIN", "SUPER_ADMIN"].includes(role)) return null;
  return session;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id } = await params;
  const bank = await prisma.partnerBank.findUnique({ where: { id } });
  if (!bank) {
    return NextResponse.json({ error: "Banque introuvable" }, { status: 404 });
  }

  try {
    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const data: {
        name?: string;
        shortName?: string;
        isActive?: boolean;
        logoUrl?: string;
      } = {};

      const name = form.get("name");
      const shortName = form.get("shortName");
      const isActive = form.get("isActive");
      const logo = form.get("logo");

      if (typeof name === "string" && name.trim()) data.name = name.trim();
      if (typeof shortName === "string" && shortName.trim()) {
        data.shortName = shortName.trim();
      }
      if (typeof isActive === "string") {
        data.isActive = isActive === "true";
      }
      if (logo instanceof File && logo.size > 0) {
        data.logoUrl = await saveBankLogo(logo, id);
      }

      const updated = await prisma.partnerBank.update({
        where: { id },
        data,
      });
      return NextResponse.json(updated);
    }

    const body = (await req.json()) as {
      name?: string;
      shortName?: string;
      isActive?: boolean;
      resendInvite?: boolean;
    };

    if (body.resendInvite) {
      await sendBankInvite(id);
      return NextResponse.json({ ok: true });
    }

    const updated = await prisma.partnerBank.update({
      where: { id },
      data: {
        ...(body.name ? { name: body.name.trim() } : {}),
        ...(body.shortName ? { shortName: body.shortName.trim() } : {}),
        ...(typeof body.isActive === "boolean"
          ? { isActive: body.isActive }
          : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
