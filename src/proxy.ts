import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Proxy RBAC (Next.js 16) — protège les routes selon l'authentification.
 *
 * Vérification légère du cookie de session. Les rôles sont contrôlés
 * dans les layouts serveur de chaque espace.
 */

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/api/register",
  "/bank/login",
  "/bank/set-password",
  "/api/bank/set-password",
  "/idp/",
  "/ministry/login",
  "/api/auth",
  "/api/v1/banks/",
];
const PUBLIC_EXACT = ["/"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_EXACT.includes(pathname)) return NextResponse.next();
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  const sessionCookie = getSessionCookie(req);

  if (!sessionCookie) {
    const loginPath = pathname.startsWith("/bank")
      ? "/bank/login"
      : pathname.startsWith("/admin") || pathname.startsWith("/ministry")
        ? "/ministry/login"
        : "/login";
    const loginUrl = new URL(loginPath, req.url);
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
