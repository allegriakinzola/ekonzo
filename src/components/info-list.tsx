import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Liste clé / valeur alignée (style relevé bancaire).
 * Les libellés sont sur une colonne fixe, les valeurs alignées à droite
 * sur mobile et à gauche sur desktop.
 */
export function InfoList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <dl className={cn("divide-y divide-border/70", className)}>{children}</dl>
  );
}

export function InfoRow({
  label,
  value,
  icon,
  mono,
  muted,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  mono?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
      <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {icon && <span className="text-muted-foreground/80">{icon}</span>}
        {label}
      </dt>
      <dd
        className={cn(
          "text-sm font-medium text-foreground",
          mono && "font-mono tracking-tight",
          muted && "font-normal text-muted-foreground",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
