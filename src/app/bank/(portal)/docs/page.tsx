import { BookOpenIcon } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/page-header";
import { requireRole } from "@/lib/session";
import { getBankByUserId } from "@/modules/banks/bank.service";
import { ensureBankOAuthCredentials } from "@/modules/banks/bank-link.service";

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

export default async function BankDocsPage() {
  const session = await requireRole("BANK", "/bank/login");
  let bank = await getBankByUserId(session.user.id);
  if (bank) bank = await ensureBankOAuthCredentials(bank.id);

  const code = bank?.code ?? "{BANK_CODE}";
  const base = `${appUrl()}/api/v1/banks/${code}`;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Développeurs"
        icon={<BookOpenIcon className="size-4" weight="duotone" />}
        title="Documentation API ekonzo"
        description="Contrat d'interopérabilité pour votre application bancaire (OAuth liaison de compte + notification de paiement)."
      />

      <article className="prose prose-sm max-w-none space-y-8 rounded-xl border bg-card p-6 shadow-sm ring-1 ring-rdc-navy/5">
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-rdc-navy">1. Rôles</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>
              <strong className="text-foreground">ekonzo</strong> : titres,
              investisseurs, sessions de paiement, confirmation métier.
            </li>
            <li>
              <strong className="text-foreground">Votre banque</strong> :
              internet banking (clients), IdP OAuth, UI de paiement, débit
              compte / MoMo, puis <code>notify</code> vers ekonzo.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-rdc-navy">
            2. OAuth — liaison de compte
          </h2>
          <p className="text-sm text-muted-foreground">
            ekonzo redirige l&apos;investisseur vers votre{" "}
            <code>authorizeUrl</code>. Après login, vous renvoyez un{" "}
            <code>code</code> vers le <code>redirect_uri</code>. ekonzo appelle
            ensuite votre <code>tokenUrl</code> puis <code>userinfoUrl</code>.
          </p>
          <div className="rounded-lg bg-muted/50 p-3 font-mono text-[12px] leading-relaxed">
            POST {"{"}tokenUrl{"}"}
            {"\n"}
            {`{ grant_type, code, redirect_uri, client_id, client_secret }`}
            {"\n\n"}
            GET {"{"}userinfoUrl{"}"} — Authorization: Bearer {"{"}access_token
            {"}"}
            {"\n"}
            {`→ { bankCustomerId, email, nom, postnom, prenom, fullName, accountNumber, accountName, currency }`}
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-rdc-navy">
            3. Paiement d&apos;une souscription
          </h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              ekonzo crée une session et redirige vers{" "}
              <code>/payments/pay?token=…&amp;client_id=…</code> sur votre
              domaine.
            </li>
            <li>
              Votre UI récupère le détail :
              <br />
              <code className="text-[12px]">
                GET {base}/payments/sessions?token=…
              </code>
              <br />
              Headers : <code>X-Client-Id</code>, <code>X-Client-Secret</code>
            </li>
            <li>
              Après débit (compte ou Mobile Money), notifiez ekonzo :
              <div className="mt-2 rounded-lg bg-muted/50 p-3 font-mono text-[12px] leading-relaxed text-foreground">
                POST {base}/payments/notify
                {"\n"}
                {`{ client_id, client_secret, token, notify_ref?, channel?: "BANK_TRANSFER"|"MOBILE_MONEY" }`}
              </div>
            </li>
            <li>
              ekonzo marque la souscription <code>PAYMENT_CONFIRMED</code> et
              renvoie <code>returnUrl</code> pour rediriger l&apos;investisseur.
            </li>
          </ol>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-rdc-navy">
            4. Ce que vous devez implémenter
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>
              <code>GET /oauth/authorize</code> — login client banque
            </li>
            <li>
              <code>POST /oauth/token</code> — échange code → access_token
            </li>
            <li>
              <code>GET /oauth/userinfo</code> — profil compte
            </li>
            <li>
              <code>GET /payments/pay</code> — UI paiement (compte + MoMo)
            </li>
            <li>Gestion de vos clients internet banking (hors ekonzo)</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-rdc-navy">5. Sécurité</h2>
          <p className="text-sm text-muted-foreground">
            Le <code>client_secret</code> ne doit jamais apparaître dans une
            application mobile ou une page publique. Stockez-le uniquement côté
            serveur de votre portail bancaire.
          </p>
        </section>
      </article>
    </div>
  );
}
