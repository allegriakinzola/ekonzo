/**
 * Banques partenaires disponibles pour l'ouverture du compte-titres.
 * Pour l'instant seule Equity BCDC est ouverte ; d'autres pourront s'ajouter.
 */

export type PartnerBank = {
  code: string;
  name: string;
  shortName: string;
  logoSrc: string;
  available: boolean;
};

export const PARTNER_BANKS: PartnerBank[] = [
  {
    code: "EQUITY_BCDC",
    name: "Equity Banque Commerciale du Congo (Equity BCDC)",
    shortName: "Equity BCDC",
    logoSrc: "/logoequity.png",
    available: true,
  },
];

export function getPartnerBankByCode(code: string): PartnerBank | null {
  return PARTNER_BANKS.find((b) => b.code === code) ?? null;
}

export function getAvailablePartnerBanks(): PartnerBank[] {
  return PARTNER_BANKS.filter((b) => b.available);
}
