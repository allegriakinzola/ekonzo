import { LinkSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/page-header";
import { requireRole } from "@/lib/session";
import { getBankByUserId } from "@/modules/banks/bank.service";
import { BankPagesForm } from "./BankPagesForm";

export default async function BankPagesPage() {
  const session = await requireRole("BANK", "/bank/login");
  const bank = await getBankByUserId(session.user.id);

  if (!bank) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucune banque associée à ce compte.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Interopérabilité"
        icon={<LinkSimpleIcon className="size-4" weight="duotone" />}
        title="Pages de votre banque"
        description="URLs que ekonzo utilisera pour la liaison de compte et le paiement. Vous fournissez les pages ; ekonzo ajoute les paramètres."
      />
      <BankPagesForm
        initial={{
          authorizeUrl: bank.authorizeUrl ?? "",
          tokenUrl: bank.tokenUrl ?? "",
          userinfoUrl: bank.userinfoUrl ?? "",
          paymentUrl: bank.paymentUrl ?? "",
        }}
      />
    </div>
  );
}
