import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

export type AppRole = "CLIENT" | "ADMIN" | "SUPER_ADMIN";

/** Récupère la session côté serveur (ou null). */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/** Exige une session authentifiée, sinon redirige vers /login. */
export async function requireAuth() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** Exige un rôle précis (ou l'un des rôles fournis), sinon redirige. */
export async function requireRole(roles: AppRole | AppRole[]) {
  const session = await requireAuth();
  const allowed = Array.isArray(roles) ? roles : [roles];
  const role = (session.user as { role?: AppRole }).role ?? "CLIENT";

  if (!allowed.includes(role)) {
    // Un client qui tente d'accéder à l'admin est renvoyé chez lui, et vice-versa.
    redirect(role === "CLIENT" ? "/dashboard" : "/admin");
  }

  return session;
}
