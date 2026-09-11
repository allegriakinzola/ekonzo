import type { InstrumentType, PrincipalRepaymentMode } from "@prisma/client";
import { isBond } from "./product.model";

const DAY_MS = 1000 * 60 * 60 * 24;

export function daysBetween(from: Date, to: Date) {
  return Math.max(1, Math.round((to.getTime() - from.getTime()) / DAY_MS));
}

/**
 * Bons du Trésor : intérêts précomptés.
 * Montant à régler = nominal × (1 − taux × jours / 365)
 * Ex. MinFi : 10 BTI 3 mois à 10 % → ≈ 975 345 FC pour 1 000 000 FC.
 */
export function bondSettlementAmount(
  nominal: number,
  annualRate: number,
  issuanceDate: Date,
  maturityDate: Date,
) {
  const days = daysBetween(issuanceDate, maturityDate);
  const payable = nominal * (1 - annualRate * (days / 365));
  return {
    days,
    payable: Math.round(payable),
    interest: Math.round(nominal - payable),
  };
}

/**
 * Obligations du Trésor : souscription au pair (taux annoncé, pas d'enchère).
 * Intérêts périodiques = nominal × taux / périodes par an.
 */
export function obligationSchedule(
  nominal: number,
  annualRate: number,
  periodsPerYear: number,
  issuanceDate: Date,
  maturityDate: Date,
  principalMode: PrincipalRepaymentMode | null,
) {
  const months = Math.max(
    1,
    Math.round(daysBetween(issuanceDate, maturityDate) / 30.4375),
  );
  const totalInterestPayments = Math.max(
    1,
    Math.round((months / 12) * periodsPerYear),
  );
  const interestPerPeriod = (nominal * annualRate) / periodsPerYear;

  let principalPayments = 1;
  if (principalMode === "SEMI_ANNUAL") {
    principalPayments = Math.max(1, Math.round(months / 6));
  } else if (principalMode === "ANNUAL") {
    principalPayments = Math.max(1, Math.round(months / 12));
  }

  return {
    payable: nominal,
    months,
    interestPerPeriod: Math.round(interestPerPeriod),
    totalInterestPayments,
    totalInterest: Math.round(interestPerPeriod * totalInterestPayments),
    principalPayments,
    principalPerPayment: Math.round(nominal / principalPayments),
  };
}

export function computeSettlement(input: {
  instrument: InstrumentType;
  units: number;
  faceValue: number;
  annualRate: number;
  issuanceDate: Date;
  maturityDate: Date;
  interestPeriodsPerYear?: number | null;
  principalRepaymentMode?: PrincipalRepaymentMode | null;
}) {
  const nominal = input.units * input.faceValue;
  if (isBond(input.instrument)) {
    const s = bondSettlementAmount(
      nominal,
      input.annualRate,
      input.issuanceDate,
      input.maturityDate,
    );
    return { kind: "BT" as const, nominal, ...s };
  }
  const s = obligationSchedule(
    nominal,
    input.annualRate,
    input.interestPeriodsPerYear ?? 4,
    input.issuanceDate,
    input.maturityDate,
    input.principalRepaymentMode ?? "AT_MATURITY",
  );
  return { kind: "OT" as const, nominal, ...s };
}
