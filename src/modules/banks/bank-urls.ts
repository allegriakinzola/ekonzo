/**
 * Construit une URL de page banque en partant de la base configurée
 * (sans query) + paramètres fournis par ekonzo.
 */
export function buildBankPageUrl(
  baseUrl: string,
  params: Record<string, string>,
): string {
  const u = new URL(baseUrl.trim());
  u.search = "";
  u.hash = "";
  for (const [key, value] of Object.entries(params)) {
    if (value !== "") u.searchParams.set(key, value);
  }
  return u.toString();
}

/** Normalise une URL de page (conserve origin+path, retire query/hash). */
export function normalizeBankPageUrl(label: string, value: string) {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${label} est requis`);

  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    throw new Error(`${label} : URL invalide`);
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error(`${label} : http(s) requis`);
  }

  u.search = "";
  u.hash = "";
  const path = u.pathname.replace(/\/+$/, "") || "";
  return `${u.origin}${path}`;
}
