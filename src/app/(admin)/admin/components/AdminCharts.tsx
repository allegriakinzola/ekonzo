"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatAmount } from "@/lib/format";

export const CHART_COLORS = {
  primary: "var(--primary)",
  navy: "var(--rdc-navy)",
  red: "var(--rdc-red)",
  amber: "oklch(0.75 0.15 75)",
  emerald: "oklch(0.7 0.15 160)",
  muted: "oklch(0.88 0.005 264)",
} as const;

export function compactAmount(n: number, currency: string) {
  return new Intl.NumberFormat("fr-CD", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n) + (currency === "USD" ? " $" : " FC");
}

const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--card)",
  fontSize: 12,
  boxShadow: "0 4px 16px rgb(0 0 0 / 0.06)",
};

export interface InstrumentBarDatum {
  short: string;
  announced: number;
  paid: number;
  pending: number;
}

/** Barres groupées par instrument : annoncé / payé / en attente (une devise). */
export function InstrumentAmountChart({
  data,
  currency,
  height = 240,
}: {
  data: InstrumentBarDatum[];
  currency: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} barGap={4} barCategoryGap="28%">
        <CartesianGrid vertical={false} stroke={CHART_COLORS.muted} strokeDasharray="3 3" />
        <XAxis
          dataKey="short"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={64}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickFormatter={(v: number) => compactAmount(v, currency)}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          contentStyle={tooltipStyle}
          formatter={(value, name) => [
            formatAmount(Number(value), currency),
            String(name),
          ]}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
        />
        <Bar dataKey="announced" name="Montant annoncé" fill={CHART_COLORS.muted} radius={[6, 6, 0, 0]} />
        <Bar dataKey="paid" name="Payé · validé" fill={CHART_COLORS.primary} radius={[6, 6, 0, 0]} />
        <Bar dataKey="pending" name="Paiement attendu" fill={CHART_COLORS.amber} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Anneau : répartition Bons vs Obligations (nombre de souscriptions payées). */
export function KindDonutChart({
  bt,
  ot,
  height = 220,
}: {
  bt: number;
  ot: number;
  height?: number;
}) {
  const total = bt + ot;
  const data = [
    { name: "Bons du Trésor", value: bt, color: CHART_COLORS.primary },
    { name: "Obligations du Trésor", value: ot, color: CHART_COLORS.navy },
  ];
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={total > 0 ? data : [{ name: "Aucune", value: 1, color: CHART_COLORS.muted }]}
            dataKey="value"
            innerRadius="62%"
            outerRadius="88%"
            paddingAngle={total > 0 ? 3 : 0}
            stroke="none"
            startAngle={90}
            endAngle={-270}
          >
            {(total > 0 ? data : [{ color: CHART_COLORS.muted }]).map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
          {total > 0 && (
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value, name) => [
                `${value} souscription${Number(value) > 1 ? "s" : ""}`,
                String(name),
              ]}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-3xl font-bold tracking-tight text-rdc-navy">{total}</p>
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
          payées
        </p>
      </div>
    </div>
  );
}

export interface TimelineDatum {
  label: string;
  bt: number;
  ot: number;
  pending: number;
}

/** Aires empilées : souscriptions par jour (BT / OT payées, en attente). */
export function SubscriptionsTimelineChart({
  data,
  height = 220,
}: {
  data: TimelineDatum[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ left: -16, right: 8 }}>
        <defs>
          <linearGradient id="gradBt" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.35} />
            <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="gradOt" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS.navy} stopOpacity={0.35} />
            <stop offset="100%" stopColor={CHART_COLORS.navy} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={CHART_COLORS.muted} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          minTickGap={24}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
        />
        <YAxis
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
        />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        <Area
          type="monotone"
          dataKey="bt"
          name="Bons payés"
          stackId="1"
          stroke={CHART_COLORS.primary}
          fill="url(#gradBt)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="ot"
          name="Obligations payées"
          stackId="1"
          stroke={CHART_COLORS.navy}
          fill="url(#gradOt)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="pending"
          name="Paiement attendu"
          stackId="1"
          stroke={CHART_COLORS.amber}
          fill={CHART_COLORS.amber}
          fillOpacity={0.15}
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export interface EmissionFillDatum {
  name: string;
  announced: number;
  paid: number;
  pending: number;
}

/** Barres horizontales par émission : montant annoncé vs payé / attendu. */
export function EmissionFillChart({
  data,
  currency,
}: {
  data: EmissionFillDatum[];
  currency: string;
}) {
  const height = Math.max(120, data.length * 44 + 40);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" barCategoryGap="30%" margin={{ left: 8, right: 16 }}>
        <CartesianGrid horizontal={false} stroke={CHART_COLORS.muted} strokeDasharray="3 3" />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickFormatter={(v: number) => compactAmount(v, currency)}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={140}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "var(--foreground)" }}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          contentStyle={tooltipStyle}
          formatter={(value, name) => [
            formatAmount(Number(value), currency),
            String(name),
          ]}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        <Bar dataKey="announced" name="Montant annoncé" fill={CHART_COLORS.muted} radius={[0, 6, 6, 0]} />
        <Bar dataKey="paid" name="Payé · validé" stackId="s" fill={CHART_COLORS.primary} />
        <Bar dataKey="pending" name="Paiement attendu" stackId="s" fill={CHART_COLORS.amber} radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
