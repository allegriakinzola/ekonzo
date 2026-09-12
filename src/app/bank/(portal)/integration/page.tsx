import { KeyIcon } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/page-header";
import { requireRole } from "@/lib/session";
import { getBankByUserId } from "@/modules/banks/bank.service";
import { ensureBankOAuthCredentials } from "@/modules/banks/bank-link.service";
import { IntegrationCredentials } from "../components/IntegrationCredentials";

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

export default async function BankIntegrationPage() {
  const session = await requireRole("BANK", "/bank/login");
  let bank = await getBankByUserId(session.user.id);
  if (!bank) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucune banque associée à ce compte.
      </p>
    );
  }
  bank = await ensureBankOAuthCredentials(bank.id);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Sécurité"
        icon={<KeyIcon className="size-4" weight="duotone" />}
        title="Identifiants d'intégration"
        description="Ces secrets authentifient votre application bancaire auprès des API ekonzo. Ne les partagez pas hors de votre équipe technique."
      />
      <IntegrationCredentials
        bankCode={bank.code}
        clientId={bank.oauthClientId ?? ""}
        clientSecret={bank.oauthClientSecret ?? ""}
        authorizeUrl={bank.authorizeUrl}
        tokenUrl={bank.tokenUrl}
        userinfoUrl={bank.userinfoUrl}
        appUrl={appUrl()}
      />
    </div>
  );
}
