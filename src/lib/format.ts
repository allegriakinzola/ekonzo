export function formatAmount(amount: number | string, currency: string): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("fr-CD", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("fr-CD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

/**
 * Affichage date de naissance sans l'année (confidentialité).
 * Ex. "09/11/2001" → "09/11/****" · "2001-11-09" → "09/11/****"
 * La valeur stockée / envoyée à l'API n'est pas modifiée.
 */
export function formatDateOfBirthDisplay(
  value: string | null | undefined,
): string {
  if (!value?.trim()) return "—";
  const raw = value.trim();

  // jj/mm/aaaa ou jj-mm-aaaa ou jj.mm.aaaa
  const dmy = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (dmy) {
    const dd = dmy[1].padStart(2, "0");
    const mm = dmy[2].padStart(2, "0");
    return `${dd}/${mm}/****`;
  }

  // aaaa-mm-jj (ISO)
  const iso = raw.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/);
  if (iso) {
    const dd = iso[3].padStart(2, "0");
    const mm = iso[2].padStart(2, "0");
    return `${dd}/${mm}/****`;
  }

  // Date JS parsable
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    const dd = String(parsed.getDate()).padStart(2, "0");
    const mm = String(parsed.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}/****`;
  }

  // Dernier recours : masquer 4 chiffres d'année en fin de chaîne
  return raw.replace(/(?:19|20)\d{2}\b/g, "****");
}

export function daysUntil(date: Date | string): number {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
}
