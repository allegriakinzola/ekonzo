import type {
  CouponFrequency,
  Currency,
  InstrumentType,
  PrincipalRepaymentMode,
  ProductType,
} from "@prisma/client";

export const INSTRUMENT_LABELS: Record<InstrumentType, string> = {
  BTI: "Bon du Trésor Indexé (BTI)",
  BT_USD: "Bon du Trésor en USD",
  OTI: "Obligation du Trésor Indexée (OTI)",
  OT_USD: "Obligation du Trésor en USD",
};

export const INSTRUMENT_SHORT: Record<InstrumentType, string> = {
  BTI: "BTI",
  BT_USD: "BT USD",
  OTI: "OTI",
  OT_USD: "OT USD",
};

export function productTypeFromInstrument(
  instrument: InstrumentType,
): ProductType {
  return instrument === "BTI" || instrument === "BT_USD" ? "BT" : "OT";
}

export function currencyFromInstrument(instrument: InstrumentType): Currency {
  return instrument === "BTI" || instrument === "OTI" ? "CDF" : "USD";
}

export function faceValueFromInstrument(instrument: InstrumentType): number {
  return currencyFromInstrument(instrument) === "CDF" ? 100_000 : 10;
}

/** Minimum = 10 titres */
export function minTicketFromInstrument(instrument: InstrumentType): number {
  return faceValueFromInstrument(instrument) * 10;
}

export function isBond(instrument: InstrumentType | null | undefined) {
  return instrument === "BTI" || instrument === "BT_USD";
}

export function isObligation(instrument: InstrumentType | null | undefined) {
  return instrument === "OTI" || instrument === "OT_USD";
}

export function resolveInstrument(input: {
  instrumentType?: InstrumentType | null;
  type?: ProductType | null;
  currency?: Currency | null;
}): InstrumentType {
  if (input.instrumentType) return input.instrumentType;
  if (input.type === "OT") {
    return input.currency === "CDF" ? "OTI" : "OT_USD";
  }
  return input.currency === "CDF" ? "BTI" : "BT_USD";
}

export function couponFrequencyFromPeriods(
  periods: number | null | undefined,
): CouponFrequency | null {
  switch (periods) {
    case 12:
      return "MONTHLY";
    case 4:
      return "QUARTERLY";
    case 2:
      return "SEMI_ANNUAL";
    case 1:
      return "ANNUAL";
    default:
      return null;
  }
}

export function formatRatePercent(
  rate: { toString(): string } | number | string | null | undefined,
) {
  if (rate == null || rate === "") return "—";
  const n = Number(rate);
  if (Number.isNaN(n)) return "—";
  return `${(n * 100).toFixed(2)} %`;
}

export function principalRepaymentLabel(
  mode: PrincipalRepaymentMode | null | undefined,
) {
  switch (mode) {
    case "AT_MATURITY":
      return "À l'échéance (unique)";
    case "SEMI_ANNUAL":
      return "Échelonné (tous les 6 mois)";
    case "ANNUAL":
      return "Échelonné (annuel)";
    default:
      return "—";
  }
}

export type CreateAdjudicationInput = {
  instrumentType: InstrumentType;
  isin: string;
  lineLabel: string;
  code?: string;
  announcedRate: number; // fraction 0–1
  totalVolume: number;
  issuanceDate: string;
  maturityDate: string;
  adjudicationDate: string;
  subscriptionDeadline: string;
  resultsDate?: string;
  settlementDate?: string;
  interestPeriodsPerYear?: number;
  principalRepaymentMode?: PrincipalRepaymentMode;
  publish?: boolean;
};

export function buildProductCreateData(input: CreateAdjudicationInput) {
  const instrumentType = input.instrumentType;
  const type = productTypeFromInstrument(instrumentType);
  const currency = currencyFromInstrument(instrumentType);
  const faceValue = faceValueFromInstrument(instrumentType);
  const minTicket = minTicketFromInstrument(instrumentType);
  const announcedRate = input.announcedRate;

  if (announcedRate < 0 || announcedRate > 1) {
    throw new Error("Taux annoncé invalide (0–100 %)");
  }
  if (input.totalVolume < minTicket) {
    throw new Error(
      `Le montant mis en adjudication doit être ≥ ${minTicket} ${currency}`,
    );
  }
  if (input.totalVolume % faceValue !== 0) {
    throw new Error(
      `Le montant doit être un multiple du nominal (${faceValue} ${currency})`,
    );
  }

  const isin = input.isin.trim().toUpperCase();
  const lineLabel = input.lineLabel.trim();
  if (!isin || isin.length < 5) throw new Error("Code ISIN invalide");
  if (!lineLabel) throw new Error("Ligne à ouvrir requise");

  const code =
    (input.code?.trim() || isin.slice(-12) || lineLabel)
      .toUpperCase()
      .replace(/\s+/g, "-")
      .slice(0, 32);

  const ot = isObligation(instrumentType);
  if (ot) {
    if (!input.interestPeriodsPerYear || input.interestPeriodsPerYear < 1) {
      throw new Error("Nombre de périodes d'intérêts requis pour une OT");
    }
    if (!input.principalRepaymentMode) {
      throw new Error("Modalité de remboursement du principal requise pour une OT");
    }
  }

  return {
    code,
    type,
    instrumentType,
    currency,
    isin,
    lineLabel,
    faceValue,
    minTicket,
    announcedRate,
    discountRate: type === "BT" ? announcedRate : null,
    couponRate: type === "OT" ? announcedRate : null,
    couponFrequency: ot
      ? couponFrequencyFromPeriods(input.interestPeriodsPerYear)
      : null,
    interestPeriodsPerYear: ot ? input.interestPeriodsPerYear! : null,
    principalRepaymentMode: ot ? input.principalRepaymentMode! : null,
    issuanceDate: new Date(input.issuanceDate),
    maturityDate: new Date(input.maturityDate),
    adjudicationDate: new Date(input.adjudicationDate),
    subscriptionDeadline: new Date(input.subscriptionDeadline),
    resultsDate: input.resultsDate ? new Date(input.resultsDate) : null,
    settlementDate: input.settlementDate
      ? new Date(input.settlementDate)
      : null,
    totalVolume: input.totalVolume,
    status: (input.publish === false ? "DRAFT" : "OPEN") as "DRAFT" | "OPEN",
  };
}
