import { BankIcon } from "@phosphor-icons/react/dist/ssr";

import { requireRole } from "@/lib/session";
import {
  getActiveBankLink,
  listActivePartnerBanks,
} from "@/modules/banks/bank-link.service";
import { PageHeader } from "@/components/page-header";
import { LinkBankChooser } from "./LinkBankChooser";

export default async function LinkBankPage() {
  const session = await requireRole("CLIENT");
  const [banks, link] = await Promise.all([
    listActivePartnerBanks(),
    getActiveBankLink(session.user.id),
  ]);

  return (
    <div className={link ? "mx-auto max-w-3xl space-y-8" : "space-y-8"}>
      <PageHeader
        backHref={link ? "/profile" : undefined}
        backLabel="Paramètres"
        eyebrow="Banque partenaire"
        icon={<BankIcon className="size-4" weight="duotone" />}
        title={link ? "Changer de banque" : "Connectez votre banque"}
        description={
          link
            ? `Vous êtes actuellement lié à ${link.partnerBank.name}. Sélectionnez une autre banque partenaire pour remplacer cette liaison.`
            : "Avant d'accéder aux titres publics, vous devez lier le compte d'une banque partenaire. Cette étape est obligatoire."
        }
      />

      <LinkBankChooser
        banks={banks}
        currentLink={
          link
            ? {
                partnerBank: link.partnerBank,
                accountNumber: link.accountNumber,
                accountName: link.accountName,
                currency: link.currency,
                fullName: link.fullName,
                linkedAt: link.linkedAt.toISOString(),
              }
            : null
        }
        requireLink={!link}
      />
    </div>
  );
}
