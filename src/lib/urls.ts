/**
 * URL publique ekonzo présentée aux banques partenaires
 * (endpoints API à appeler depuis leur application).
 * Distincte de NEXT_PUBLIC_APP_URL qui peut rester localhost en dev.
 */
export function ekonzoPublicApiUrl() {
  return (
    process.env.NEXT_PUBLIC_EKONZO_PUBLIC_URL ??
    "https://www.ekonzo.site"
  ).replace(/\/$/, "");
}

/** URL de l'instance courante (callbacks OAuth, liens internes). */
export function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}
