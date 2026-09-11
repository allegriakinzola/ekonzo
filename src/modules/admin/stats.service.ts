import type { Currency, InstrumentType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  INSTRUMENT_SHORT,
  isObligation,
  resolveInstrument,
} from "@/modules/products/product.model";

/** Souscriptions réelles = tout sauf tentatives échouées / annulées. */
export const DISCARDED = ["FAILED", "CANCELLED"] as const;
/** Souscriptions payées = validées (soumises et adjugées de fait). */
export const PAID = [
  "PAYMENT_CONFIRMED",
  "SUBMITTED",
  "ADJUDICATED",
  "PARTIALLY_ADJUDICATED",
  "ACTIVE",
] as const;

export const INSTRUMENT_ORDER: InstrumentType[] = ["BTI", "BT_USD", "OTI", "OT_USD"];

export interface InstrumentStat {
  instrument: InstrumentType;
  short: string;
  kind: "BT" | "OT";
  currency: Currency;
  products: number;
  openProducts: number;
  announced: number;
  paid: number;
  pending: number;
  paidCount: number;
  pendingCount: number;
}

export interface TimelinePoint {
  date: string; // ISO yyyy-mm-dd
  label: string; // jj/mm
  bt: number;
  ot: number;
  pending: number;
}

export interface CurrencyTotals {
  currency: Currency;
  announced: number;
  paid: number;
  pending: number;
}

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function dayLabel(key: string) {
  const [, m, d] = key.split("-");
  return `${d}/${m}`;
}

/**
 * Statistiques globales du Ministère : par instrument, par devise et
 * chronologie des souscriptions sur N jours.
 */
export async function getAdminStats(timelineDays = 30) {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - (timelineDays - 1));

  const [products, subs] = await Promise.all([
    prisma.product.findMany({
      where: { status: { not: "DRAFT" } },
      select: {
        id: true,
        type: true,
        currency: true,
        instrumentType: true,
        totalVolume: true,
        status: true,
      },
    }),
    prisma.subscription.findMany({
      where: { status: { notIn: [...DISCARDED] } },
      select: {
        amount: true,
        currency: true,
        status: true,
        createdAt: true,
        product: { select: { type: true, currency: true, instrumentType: true } },
      },
    }),
  ]);

  const byInstrument = new Map<InstrumentType, InstrumentStat>(
    INSTRUMENT_ORDER.map((instrument) => [
      instrument,
      {
        instrument,
        short: INSTRUMENT_SHORT[instrument],
        kind: isObligation(instrument) ? "OT" : "BT",
        currency: instrument === "BTI" || instrument === "OTI" ? "CDF" : "USD",
        products: 0,
        openProducts: 0,
        announced: 0,
        paid: 0,
        pending: 0,
        paidCount: 0,
        pendingCount: 0,
      },
    ]),
  );

  for (const p of products) {
    const stat = byInstrument.get(resolveInstrument(p))!;
    stat.products += 1;
    if (p.status === "OPEN") stat.openProducts += 1;
    stat.announced += Number(p.totalVolume);
  }

  const timeline = new Map<string, TimelinePoint>();
  for (let i = 0; i < timelineDays; i++) {
    const d = new Date(since);
    d.setUTCDate(since.getUTCDate() + i);
    const key = dayKey(d);
    timeline.set(key, { date: key, label: dayLabel(key), bt: 0, ot: 0, pending: 0 });
  }

  for (const s of subs) {
    const stat = byInstrument.get(resolveInstrument(s.product))!;
    const amount = Number(s.amount);
    const isPaid = (PAID as readonly string[]).includes(s.status);
    if (isPaid) {
      stat.paid += amount;
      stat.paidCount += 1;
    } else if (s.status === "PENDING_PAYMENT") {
      stat.pending += amount;
      stat.pendingCount += 1;
    }

    const point = timeline.get(dayKey(s.createdAt));
    if (point) {
      if (!isPaid) point.pending += 1;
      else if (stat.kind === "OT") point.ot += 1;
      else point.bt += 1;
    }
  }

  const instruments = INSTRUMENT_ORDER.map((i) => byInstrument.get(i)!);

  const currencies: CurrencyTotals[] = (["CDF", "USD"] as Currency[]).map(
    (currency) => {
      const rows = instruments.filter((i) => i.currency === currency);
      return {
        currency,
        announced: rows.reduce((s, r) => s + r.announced, 0),
        paid: rows.reduce((s, r) => s + r.paid, 0),
        pending: rows.reduce((s, r) => s + r.pending, 0),
      };
    },
  );

  const kinds = (["BT", "OT"] as const).map((kind) => {
    const rows = instruments.filter((i) => i.kind === kind);
    return {
      kind,
      paidCount: rows.reduce((s, r) => s + r.paidCount, 0),
      pendingCount: rows.reduce((s, r) => s + r.pendingCount, 0),
      products: rows.reduce((s, r) => s + r.products, 0),
    };
  });

  return {
    instruments,
    currencies,
    kinds,
    timeline: [...timeline.values()],
    totals: {
      products: products.length,
      paidCount: instruments.reduce((s, r) => s + r.paidCount, 0),
      pendingCount: instruments.reduce((s, r) => s + r.pendingCount, 0),
    },
  };
}

export type AdminStats = Awaited<ReturnType<typeof getAdminStats>>;
