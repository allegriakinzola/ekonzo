import { BuildingIcon } from "@phosphor-icons/react/dist/ssr";
import { requireRole } from "@/lib/session";
import { getBankByUserId } from "@/modules/banks/bank.service";

export default async function BankHomePage() {
  const session = await requireRole("BANK", "/bank/login");
  const bank = await getBankByUserId(session.user.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <BuildingIcon className="size-5" weight="duotone" />
            <span className="text-xs font-medium uppercase tracking-wide">
              Espace banque
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-rdc-navy">
            Bienvenue{bank ? `, ${bank.shortName}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground">
            {bank
              ? `${bank.name} — espace partenaire ekonzo.`
              : "Espace banques partenaires ekonzo."}{" "}
            Les modules d&apos;intégration seront branchés ici.
          </p>
        </div>
        {bank?.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bank.logoUrl}
            alt={bank.shortName}
            className="h-16 w-auto max-w-[180px] rounded-lg border bg-white object-contain p-2 shadow-sm"
          />
        )}
      </div>

      <div className="rounded-xl border border-dashed border-rdc-navy/20 bg-white/60 px-6 py-16 text-center">
        <p className="text-base font-semibold text-rdc-navy">
          Module en préparation
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Aucune fonctionnalité opérationnelle n&apos;est active pour le moment.
        </p>
      </div>
    </div>
  );
}
