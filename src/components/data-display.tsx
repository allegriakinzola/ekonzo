import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Carte KPI compacte : icône teintée, valeur, libellé, sous-texte.
 * Utilisée dans les tableaux de bord admin.
 */
export function StatCard({
  label,
  value,
  sub,
  icon,
  accent = "text-primary bg-primary/10 ring-primary/15",
  className,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  accent?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3.5 rounded-xl border border-border/80 bg-card p-4 shadow-sm ring-1 ring-rdc-navy/5",
        className,
      )}
    >
      {icon && (
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg ring-1",
            accent,
          )}
        >
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 truncate text-2xl font-bold tracking-tight text-rdc-navy">
          {value}
        </p>
        {sub && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</p>
        )}
      </div>
    </div>
  );
}

export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-rdc-navy/10 font-bold text-rdc-navy",
        size === "sm" ? "size-8 text-[11px]" : "size-9 text-xs",
        className,
      )}
    >
      {initials || "?"}
    </div>
  );
}

export function BankLogo({
  logoUrl,
  shortName,
  size = "md",
  className,
}: {
  logoUrl: string | null | undefined;
  shortName: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const cls =
    size === "lg" ? "size-14" : size === "sm" ? "size-8 text-[10px]" : "size-10 text-xs";
  // Anciens chemins /uploads/… non durables hors machine locale
  const usable =
    logoUrl &&
    (logoUrl.startsWith("data:") ||
      logoUrl.startsWith("http://") ||
      logoUrl.startsWith("https://"));
  return usable ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl}
      alt={shortName}
      className={cn(cls, "shrink-0 rounded-md border bg-white object-contain p-0.5", className)}
    />
  ) : (
    <div
      className={cn(
        cls,
        "flex shrink-0 items-center justify-center rounded-md border bg-white font-bold text-rdc-navy",
        className,
      )}
    >
      {shortName.slice(0, 2).toUpperCase()}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      {icon && (
        <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <p className="text-sm font-semibold text-rdc-navy">{title}</p>
        {description && (
          <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
