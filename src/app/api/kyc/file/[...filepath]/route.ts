import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "kyc");

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filepath: string[] }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { filepath } = await params;
  const role = (session.user as { role?: string }).role ?? "CLIENT";

  const [userId, ...rest] = filepath;

  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(role);
  const isOwner = session.user.id === userId;

  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const safePath = path.join(UPLOAD_DIR, userId, ...rest);
  if (!safePath.startsWith(UPLOAD_DIR)) {
    return NextResponse.json({ error: "Chemin invalide" }, { status: 400 });
  }

  try {
    const buffer = await readFile(safePath);
    const ext = safePath.split(".").pop()?.toLowerCase() ?? "jpg";
    const mimeMap: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
    };
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mimeMap[ext] ?? "application/octet-stream",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
  }
}
