import Link from "next/link";
import {
  BookOpenIcon,
  KeyIcon,
  PlugsConnectedIcon,
} from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/page-header";
import { requireRole } from "@/lib/session";
import { getBankByUserId } from "@/modules/banks/bank.service";
import { ensureBankOAuthCredentials } from "@/modules/banks/bank-link.service";
import { isUsableLogoUrl } from "@/lib/logo";
import { IntegrationCredentials } from "./components/IntegrationCredentials";

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

export default async function BankHomePage() {
  const session = await requireRole("BANK", "/bank/login");
  let bank = await getBankByUserId(session.user.id);
  if (bank) {
    bank = await ensureBankOAuthCredentials(bank.id);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Console partenaire"
        icon={<PlugsConnectedIcon className="size-4" weight="duotone" />}
        title={bank ? `Bienvenue, ${bank.shortName}` : "Espace banque"}
        description={
          bank
            ? `${bank.name} — gérez ici vos identifiants d'intégration ekonzo. Les opérations clients et paiements se font dans votre application bancaire (ex. Equity).`
            : "Espace banques partenaires ekonzo."
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/bank/integration"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs font-medium hover:bg-muted"
            >
              <KeyIcon className="size-4" />
              Identifiants
            </Link>
            <Link
              href="/bank/docs"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/80"
            >
              <BookOpenIcon className="size-4" />
              Documentation
            </Link>
          </div>
        }
      />

      {isUsableLogoUrl(bank?.logoUrl) && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={bank!.logoUrl!}
          alt={bank!.shortName}
          className="h-14 w-auto max-w-[160px] rounded-lg border bg-white object-contain p-2"
        />
      )}

      {bank ? (
        <IntegrationCredentials
          bankCode={bank.code}
          clientId={bank.oauthClientId ?? ""}
          clientSecret={bank.oauthClientSecret ?? ""}
          authorizeUrl={bank.authorizeUrl}
          tokenUrl={bank.tokenUrl}
          userinfoUrl={bank.userinfoUrl}
          appUrl={appUrl()}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          Aucune banque associée à ce compte.
        </p>
      )}
    </div>
  );
}
