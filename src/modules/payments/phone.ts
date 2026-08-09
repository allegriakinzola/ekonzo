/**
 * Format téléphone ekonzo / EasyPay MoMo :
 * 9 chiffres, sans 0 ni indicatif +243.
 * Ex. 812345678
 */

export const MOMO_PHONE_REGEX = /^[89]\d{8}$/;

/**
 * Normalise un numéro MoMo pour stockage / EasyPay.
 * Ex. +243 81 234 5678 → 812345678
 */
export function normalizeMomoPhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");

  if (digits.startsWith("243") && digits.length > 9) {
    digits = digits.slice(3);
  }
  if (digits.startsWith("0")) {
    digits = digits.replace(/^0+/, "");
  }

  return digits;
}

export function isValidMomoPhone(phone: string): boolean {
  return MOMO_PHONE_REGEX.test(phone);
}

/** Format international pour l’envoi SMS (Infobip). */
export function toSmsPhone(localNineDigits: string): string {
  const local = normalizeMomoPhone(localNineDigits);
  return `243${local}`;
}

export const MOMO_PHONE_ERROR =
  "Numéro invalide. Saisissez 9 chiffres sans 0 ni +243 (ex. 812345678).";

export type MomoOperator = "AIRTEL" | "ORANGE" | "MPESA";

/**
 * Déduit l’opérateur RDC à partir du préfixe (affichage / stockage uniquement).
 * EasyPay n’a pas besoin de l’opérateur — seul le numéro compte.
 */
export function inferMomoOperator(phone: string): MomoOperator {
  const local = normalizeMomoPhone(phone);
  const p2 = local.slice(0, 2);

  // Vodacom M-Pesa : 81, 82, 83
  if (["81", "82", "83"].includes(p2)) return "MPESA";
  // Orange Money : 84, 85, 89, 80, 90
  if (["84", "85", "89", "80", "90"].includes(p2)) return "ORANGE";
  // Airtel Money : 97, 98, 99 (et défaut)
  return "AIRTEL";
}
