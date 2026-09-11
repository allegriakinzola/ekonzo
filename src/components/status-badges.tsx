import type { PaymentChannel, SubscriptionStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Logique métier : une souscription payée par la banque est validée
 * (elle vaut soumission et adjudication au taux annoncé par le Ministère).
 * Les anciens statuts intermédiaires sont donc tous affichés « Validée ».
 */
export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  PENDING_PAYMENT: "Paiement attendu",
  PAYMENT_CONFIRMED: "Payée · validée",
  SUBMITTED: "Validée",
  ADJUDICATED: "Validée",
  PARTIALLY_ADJUDICATED: "Validée",
  ACTIVE: "Titres actifs",
  REIMBURSED: "Remboursée",
  CANCELLED: "Annulée",
  FAILED: "Échouée",
};

/** Statuts « payée = validée ». */
export const PAID_STATUSES: SubscriptionStatus[] = [
  "PAYMENT_CONFIRMED",
  "SUBMITTED",
  "ADJUDICATED",
  "PARTIALLY_ADJUDICATED",
  "ACTIVE",
];

export const PRODUCT_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  OPEN: "Ouverte",
  CLOSED: "Clôturée",
  ADJUDICATED: "Adjugée",
  ACTIVE: "Active",
  MATURED: "Échue",
};

export const ROLE_LABELS: Record<string, string> = {
  CLIENT: "Investisseur",
  BANK: "Banque",
  ADMIN: "Administrateur",
  SUPER_ADMIN: "Super admin",
};

/** Statuts considérés comme des souscriptions réelles (hors tentatives abandonnées). */
export const DISCARDED_STATUSES: SubscriptionStatus[] = ["FAILED", "CANCELLED"];

/** Statuts avec engagement financier confirmé. */
export const COMMITTED_STATUSES: SubscriptionStatus[] = [
  "PAYMENT_CONFIRMED",
  "SUBMITTED",
  "ADJUDICATED",
  "PARTIALLY_ADJUDICATED",
  "ACTIVE",
];

export function paymentChannelLabel(channel: PaymentChannel | string | null) {
  if (channel === "MOBILE_MONEY") return "Mobile Money";
  if (channel === "BANK_TRANSFER") return "Compte bancaire";
  return "—";
}

export function subscriptionStatusClass(status: string) {
  switch (status) {
    case "PAYMENT_CONFIRMED":
    case "SUBMITTED":
    case "ADJUDICATED":
    case "PARTIALLY_ADJUDICATED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "ACTIVE":
      return "border-rdc-navy/20 bg-rdc-navy/10 text-rdc-navy";
    case "PENDING_PAYMENT":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "CANCELLED":
    case "FAILED":
      return "border-destructive/20 bg-destructive/10 text-destructive";
    case "REIMBURSED":
      return "border-border bg-muted text-muted-foreground";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

export function productStatusClass(status: string) {
  switch (status) {
    case "OPEN":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "CLOSED":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "ADJUDICATED":
      return "border-primary/20 bg-primary/10 text-primary";
    case "ACTIVE":
      return "border-rdc-navy/20 bg-rdc-navy/10 text-rdc-navy";
    case "MATURED":
      return "border-border bg-muted text-muted-foreground";
    default:
      return "border-dashed border-border bg-muted/50 text-muted-foreground";
  }
}

export function roleClass(role: string) {
  switch (role) {
    case "SUPER_ADMIN":
      return "border-primary/20 bg-primary/10 text-primary";
    case "ADMIN":
      return "border-rdc-navy/20 bg-rdc-navy/10 text-rdc-navy";
    case "BANK":
      return "border-amber-200 bg-amber-50 text-amber-800";
    default:
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
}

export function SubscriptionStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(subscriptionStatusClass(status), className)}
    >
      {SUBSCRIPTION_STATUS_LABELS[status as SubscriptionStatus] ?? status}
    </Badge>
  );
}

export function ProductStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn(productStatusClass(status), className)}>
      {PRODUCT_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

export function InstrumentBadge({
  short,
  isObligation,
  className,
}: {
  short: string;
  isObligation?: boolean;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-semibold",
        isObligation
          ? "border-rdc-navy/20 bg-rdc-navy/10 text-rdc-navy"
          : "border-primary/20 bg-primary/10 text-primary",
        className,
      )}
    >
      {short}
    </Badge>
  );
}
