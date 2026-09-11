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
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        backHref="/profile"
        backLabel="Paramètres"
        eyebrow="Banque partenaire"
        icon={<BankIcon className="size-4" weight="duotone" />}
        title={link ? "Changer de banque" : "Lier ma banque"}
        description={
          link
            ? `Vous êtes actuellement lié à ${link.partnerBank.name}. Sélectionnez une autre banque partenaire pour remplacer cette liaison.`
            : "Choisissez la banque qui tient votre compte. Vous serez redirigé vers son interface pour vous authentifier, puis ramené sur ekonzo."
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
      />
    </div>
  );
}
