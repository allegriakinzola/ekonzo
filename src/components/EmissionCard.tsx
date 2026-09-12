import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import type { InstrumentType } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { daysUntil, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  INSTRUMENT_SHORT,
  formatRatePercent,
  isObligation,
  resolveInstrument,
} from "@/modules/products/product.model";

export type EmissionCardProduct = {
  id: string;
  code: string;
  type: "BT" | "OT";
  instrumentType: InstrumentType | null;
  currency: string;
  lineLabel: string | null;
  announcedRate?: { toString(): string } | number | null;
  discountRate?: { toString(): string } | number | null;
  couponRate?: { toString(): string } | number | null;
  subscriptionDeadline: Date;
};

/**
 * Carte émission — synthèse professionnelle (peu d'infos).
 * Détails complets sur la fiche `/products/[id]`.
 */
export function EmissionCard({ product }: { product: EmissionCardProduct }) {
  const instrument = resolveInstrument({
    instrumentType: product.instrumentType,
    type: product.type,
    currency: product.currency as "CDF" | "USD",
  });
  const ot = isObligation(instrument);
  const days = daysUntil(product.subscriptionDeadline);
  const urgent = days <= 3;
  const rate =
    product.announcedRate ?? product.discountRate ?? product.couponRate;

  return (
    <Card className="group/product flex flex-col ring-1 ring-rdc-navy/5 transition-shadow hover:shadow-md">
      <CardContent className="flex flex-1 flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "font-semibold",
                  ot
                    ? "border-rdc-navy/20 bg-rdc-navy/10 text-rdc-navy"
                    : "border-primary/20 bg-primary/10 text-primary",
                )}
              >
                {INSTRUMENT_SHORT[instrument]}
              </Badge>
              <Badge variant="outline">{product.currency}</Badge>
            </div>
            <h2 className="truncate text-base font-semibold leading-snug text-rdc-navy">
              {product.lineLabel ?? product.code}
            </h2>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[1.75rem] font-bold leading-none tracking-tight text-primary">
              {formatRatePercent(rate)}
            </p>
            <p className="mt-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Taux
            </p>
          </div>
        </div>

        <p
          className={cn(
            "text-sm",
            urgent ? "font-medium text-destructive" : "text-muted-foreground",
          )}
        >
          Clôture {formatDate(product.subscriptionDeadline)}
          {urgent
            ? ` · ${days} j restant${days > 1 ? "s" : ""}`
            : days > 0
              ? ` · ${days} j`
              : ""}
        </p>
      </CardContent>

      <CardFooter className="justify-end border-t bg-muted/20">
        <Button size="sm" render={<Link href={`/products/${product.id}`} />}>
          Voir &amp; souscrire
          <ArrowRightIcon
            className="size-3.5 transition-transform group-hover/product:translate-x-0.5"
            weight="bold"
          />
        </Button>
      </CardFooter>
    </Card>
  );
}
