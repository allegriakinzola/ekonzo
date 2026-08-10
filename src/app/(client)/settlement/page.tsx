import { WalletIcon } from "@phosphor-icons/react/dist/ssr";
import { getSettlementProfile } from "@/modules/settlement/settlement.service";
import { requireRole } from "@/lib/session";
import { SettlementProfileForm } from "./SettlementProfileForm";

export default async function SettlementPage() {
  const session = await requireRole("CLIENT");
  const profile = await getSettlementProfile(session.user.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-primary">
          <WalletIcon className="size-5" weight="duotone" />
          <span className="text-xs font-medium uppercase tracking-wide">
            Paiement
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-rdc-navy">
          Profil de règlement
        </h1>
        <p className="text-sm text-muted-foreground">
          Définissez votre Mobile Money ou RIB préféré. Ces informations seront
          réutilisées à chaque souscription.
        </p>
      </div>

      <SettlementProfileForm initialProfile={profile} />
    </div>
  );
}
