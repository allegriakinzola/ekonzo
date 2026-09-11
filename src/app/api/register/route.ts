import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  confirmRegistration,
  resendRegistrationOtp,
  startRegistration,
} from "@/modules/auth/register.service";

const startSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

const confirmSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
  password: z.string().min(8),
});

const resendSchema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  const action = new URL(req.url).searchParams.get("action") ?? "start";

  try {
    const body = await req.json();

    if (action === "start") {
      const parsed = startSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Données invalides" }, { status: 400 });
      }
      const result = await startRegistration(parsed.data);
      return NextResponse.json({
        ok: true,
        email: result.email,
        message: "Code de vérification envoyé par e-mail.",
      });
    }

    if (action === "resend") {
      const parsed = resendSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "E-mail invalide" }, { status: 400 });
      }
      await resendRegistrationOtp(parsed.data.email);
      return NextResponse.json({ ok: true, message: "Nouveau code envoyé." });
    }

    if (action === "confirm") {
      const parsed = confirmSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Données invalides" }, { status: 400 });
      }
      const result = await confirmRegistration(parsed.data);
      return NextResponse.json({
        ok: true,
        email: result.email,
        name: result.name,
        message: "Compte créé. Vous pouvez vous connecter.",
      });
    }

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Impossible de traiter l'inscription.";
    const status =
      message.includes("existe déjà") || message.includes("déjà utilisé")
        ? 409
        : message.includes("invalide") ||
            message.includes("expiré") ||
            message.includes("trop") ||
            message.includes("Trop")
          ? 400
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
