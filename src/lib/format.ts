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

export function daysUntil(date: Date | string): number {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
}
