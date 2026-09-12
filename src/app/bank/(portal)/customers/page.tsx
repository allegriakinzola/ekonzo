import Link from "next/link";
import { ArrowSquareOutIcon, InfoIcon } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/page-header";
import { requireRole } from "@/lib/session";

/**
 * Les clients internet banking sont gérés dans l'application de la banque
 * (ex. Equity), plus dans ekonzo.
 */
export default async function BankCustomersMovedPage() {
  await requireRole("BANK", "/bank/login");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Déplacé"
        icon={<InfoIcon className="size-4" weight="duotone" />}
        title="Clients bancaires"
        description="La gestion des clients internet banking et des paiements se fait désormais dans votre application bancaire, via les API ekonzo."
      />
      <div className="rounded-xl border bg-card p-6 shadow-sm ring-1 ring-rdc-navy/5">
        <p className="text-sm text-muted-foreground">
          Utilisez vos identifiants d&apos;intégration (client_id / secret) dans
          votre portail (ex. Equity BCDC) pour créer des clients, encaisser par
          compte ou Mobile Money, puis notifier ekonzo.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/bank/integration"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/80"
          >
            Voir mes identifiants API
          </Link>
          <Link
            href="/bank/docs"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs font-medium hover:bg-muted"
          >
            Documentation
            <ArrowSquareOutIcon className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
