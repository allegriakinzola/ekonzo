import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

export type AppRole = "CLIENT" | "BANK" | "ADMIN" | "SUPER_ADMIN";

function homeForRole(role: AppRole) {
  switch (role) {
    case "BANK":
      return "/bank";
    case "ADMIN":
    case "SUPER_ADMIN":
      return "/admin";
    default:
      return "/dashboard";
  }
}

/**
 * Une seule lecture de session par requête React (layout + page partagent le résultat).
 */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

/** Exige une session authentifiée, sinon redirige vers /login. */
export async function requireAuth(loginPath = "/login") {
  const session = await getSession();
  if (!session) redirect(loginPath);
  return session;
}

/** Exige un rôle précis (ou l'un des rôles fournis), sinon redirige. */
export async function requireRole(
  roles: AppRole | AppRole[],
  loginPath = "/login",
) {
  const session = await requireAuth(loginPath);
  const allowed = Array.isArray(roles) ? roles : [roles];
  const role = (session.user as { role?: AppRole }).role ?? "CLIENT";

  if (!allowed.includes(role)) {
    redirect(homeForRole(role));
  }

  return session;
}
