import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { prisma } from "./prisma";

export type AppRole = "CLIENT" | "ADMIN" | "SUPER_ADMIN";

/**
 * Une seule lecture de session par requête React (layout + page partagent le résultat).
 * Avec cookieCache Better Auth, souvent zéro hit DB.
 */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

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
    redirect(role === "CLIENT" ? "/dashboard" : "/admin");
  }

  return session;
}

/**
 * Statut KYC dédupliqué par requête (layout sidebar + pages produits/dashboard).
 */
export const getUserKycStatus = cache(async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { kycStatus: true },
  });
  return user?.kycStatus ?? "PENDING";
});

/**
 * Indique si l'utilisateur a signé la version active de la convention
 * de compte-titres.
 */
export const hasSignedConvention = cache(async (userId: string) => {
  const { hasSignedActiveConvention } = await import(
    "@/modules/convention/convention.service"
  );
  return hasSignedActiveConvention(userId);
});
