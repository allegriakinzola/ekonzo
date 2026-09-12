/** Compose un libellé d'affichage à partir des parties du nom (RDC). */
export function composePersonName(parts: {
  nom: string;
  postnom?: string | null;
  prenom: string;
}) {
  return [parts.nom, parts.postnom, parts.prenom]
    .map((p) => (p ?? "").trim())
    .filter(Boolean)
    .join(" ");
}

export function normalizeNamePart(value: string) {
  return value.trim().replace(/\s+/g, " ");
}
