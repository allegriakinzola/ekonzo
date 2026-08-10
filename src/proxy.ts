import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Proxy RBAC (Next.js 16) — protège les route groups selon l'authentification.
 *
 * Stratégie :
 *   - Vérification légère du cookie de session au niveau edge (rapide).
 *   - La vérification fine du rôle (CLIENT vs ADMIN) se fait dans les
 *     layouts serveur (client)/layout.tsx et (admin)/layout.tsx.
 *
 * Ici on se contente de rediriger les visiteurs non authentifiés vers /login.
 */

const PUBLIC_PATHS = ["/login", "/register", "/verify-otp", "/api/auth"];
const PUBLIC_EXACT = ["/"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_EXACT.includes(pathname)) return NextResponse.next();
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  const sessionCookie = getSessionCookie(req);

  if (!sessionCookie) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
