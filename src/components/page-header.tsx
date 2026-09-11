import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr";

import { cn } from "@/lib/utils";

/**
 * En-tête de page unifié (espaces client, banque et administration) :
 * eyebrow + icône, titre, description, actions alignées à droite,
 * lien retour optionnel.
 */
export function PageHeader({
  eyebrow,
  icon,
  title,
  description,
  actions,
  backHref,
  backLabel = "Retour",
  className,
}: {
  eyebrow: string;
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  backHref?: string;
  backLabel?: string;
  className?: string;
}) {
  return (
    <header className={cn("space-y-3", className)}>
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon className="size-3.5" weight="bold" />
          {backLabel}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 text-primary">
            {icon}
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em]">
              {eyebrow}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-rdc-navy sm:text-[1.75rem]">
            {title}
          </h1>
          {description && (
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
