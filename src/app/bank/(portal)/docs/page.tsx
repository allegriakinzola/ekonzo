import { BookOpenIcon } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/page-header";
import { requireRole } from "@/lib/session";
import { ekonzoPublicApiUrl } from "@/lib/urls";
import { getBankByUserId } from "@/modules/banks/bank.service";
import { ensureBankOAuthCredentials } from "@/modules/banks/bank-link.service";

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg bg-rdc-navy p-4 font-mono text-[12px] leading-relaxed text-white/90">
      <code>{children}</code>
    </pre>
  );
}

export default async function BankDocsPage() {
  const session = await requireRole("BANK", "/bank/login");
  let bank = await getBankByUserId(session.user.id);
  if (bank) bank = await ensureBankOAuthCredentials(bank.id);

  const code = bank?.code ?? "{BANK_CODE}";
  const publicBase = ekonzoPublicApiUrl();
  const apiBase = `${publicBase}/api/v1/banks/${code}`;
  const authorize =
    bank?.authorizeUrl ?? "https://votre-banque.example/oauth/authorize";
  const tokenUrl =
    bank?.tokenUrl ?? "https://votre-banque.example/api/oauth/token";
  const userinfoUrl =
    bank?.userinfoUrl ?? "https://votre-banque.example/api/oauth/userinfo";
  const payUrl =
    bank?.paymentUrl ?? "https://votre-banque.example/payments/pay";

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Développeurs"
        icon={<BookOpenIcon className="size-4" weight="duotone" />}
        title="Documentation API ekonzo"
        description="Contrat d'interopérabilité : ce que votre banque doit exposer (OAuth) et ce qu'elle doit appeler chez ekonzo (paiement)."
      />

      <nav className="flex flex-wrap gap-x-4 gap-y-2 rounded-xl border bg-card px-4 py-3 text-sm font-medium shadow-sm ring-1 ring-rdc-navy/5">
        {[
          ["#roles", "Rôles"],
          ["#oauth", "OAuth à exposer"],
          ["#paiement", "API paiement ekonzo"],
          ["#checklist", "Checklist"],
          ["#securite", "Sécurité"],
        ].map(([href, label]) => (
          <a
            key={href}
            href={href}
            className="text-rdc-navy underline-offset-4 hover:underline"
          >
            {label}
          </a>
        ))}
      </nav>

      <article className="space-y-8 rounded-xl border bg-card p-6 shadow-sm ring-1 ring-rdc-navy/5">
        <section id="roles" className="scroll-mt-24 space-y-3">
          <h2 className="text-base font-semibold text-rdc-navy">1. Rôles</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-muted/50 p-4 text-sm">
              <p className="font-semibold text-foreground">ekonzo</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-muted-foreground">
                <li>Titres, investisseurs, souscriptions</li>
                <li>Crée la session de paiement</li>
                <li>Appelle votre IdP : authorize → token → userinfo</li>
                <li>Confirme le métier après votre <code>notify</code></li>
              </ul>
            </div>
            <div className="rounded-lg bg-muted/50 p-4 text-sm">
              <p className="font-semibold text-foreground">Votre banque</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-muted-foreground">
                <li>Internet banking (clients + soldes)</li>
                <li>Expose OAuth + UI <code>/payments/pay</code></li>
                <li>
                  Appelle ekonzo : <code>GET …/sessions</code> puis{" "}
                  <code>POST …/notify</code>
                </li>
              </ul>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Banque configurée : <code className="text-foreground">{code}</code>.
            Base API : <code className="text-foreground">{apiBase}</code>
          </p>
        </section>

        <section id="oauth" className="scroll-mt-24 space-y-4">
          <h2 className="text-base font-semibold text-rdc-navy">
            2. OAuth — ce que vous devez exposer
          </h2>
          <p className="text-sm text-muted-foreground">
            ekonzo redirige l&apos;investisseur vers votre{" "}
            <code>authorizeUrl</code>. Après login, vous renvoyez un{" "}
            <code>code</code> à usage unique. ekonzo l&apos;échange côté serveur
            (avec <code>client_secret</code>) contre un{" "}
            <code>access_token</code>, puis lit le profil.
          </p>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">
              A. Authorize (navigateur)
            </p>
            <CodeBlock>{`GET ${authorize}
  ?response_type=code
  &client_id={votre_client_id}
  &redirect_uri=${publicBase}/profile/bank/callback
  &state=…

→ rediriger vers :
{redirect_uri}?code=ABC123&state=…`}</CodeBlock>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">
              B. Token (serveur ekonzo → votre banque)
            </p>
            <CodeBlock>{`POST ${tokenUrl}
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "ABC123",
  "redirect_uri": "${publicBase}/profile/bank/callback",
  "client_id": "…",
  "client_secret": "…"
}

→ {
  "access_token": "…",
  "token_type": "Bearer",
  "expires_in": 1800
}`}</CodeBlock>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">
              C. Userinfo (serveur ekonzo → votre banque)
            </p>
            <CodeBlock>{`GET ${userinfoUrl}
Authorization: Bearer {access_token}

→ {
  "bankCustomerId": "…",
  "email": "jean@email.cd",
  "nom": "Mbala",
  "postnom": "Kabasele",
  "prenom": "Jean",
  "fullName": "Mbala Kabasele Jean",
  "accountNumber": "000129876543210",
  "accountName": "Mbala Kabasele Jean",
  "currency": "CDF"
}`}</CodeBlock>
            <p className="text-sm text-muted-foreground">
              Tous ces champs sont attendus pour créer le lien de compte (
              <code>BankLink</code>).
            </p>
          </div>
        </section>

        <section id="paiement" className="scroll-mt-24 space-y-4">
          <h2 className="text-base font-semibold text-rdc-navy">
            3. Paiement — API ekonzo à appeler
          </h2>
          <ol className="list-decimal space-y-4 pl-5 text-sm text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">
                ekonzo crée une session
              </span>{" "}
              et redirige vers votre UI :
              <div className="mt-2">
                <CodeBlock>{`GET ${payUrl}?token={token_clair}&client_id={client_id}
(ekonzo construit cette URL à partir de votre paymentUrl)`}</CodeBlock>
              </div>
            </li>
            <li>
              <span className="font-medium text-foreground">
                Votre serveur lit le détail
              </span>{" "}
              (jamais le navigateur avec le secret) :
              <div className="mt-2">
                <CodeBlock>{`GET ${apiBase}/payments/sessions?token={token_clair}

Headers:
  X-Client-Id: {client_id}
  X-Client-Secret: {client_secret}

→ {
  "token": "…",
  "status": "PENDING",
  "amount": 100,
  "currency": "USD",
  "productLabel": "Bon du Trésor…",
  "instrumentKind": "BOND",
  "accountNumber": "…",
  "accountName": "…",
  "returnUrl": "${publicBase}/…",
  "expiresAt": "…",
  "bank": { "code": "${code}", "shortName": "…", "name": "…" }
}`}</CodeBlock>
              </div>
            </li>
            <li>
              <span className="font-medium text-foreground">
                Après débit réussi
              </span>{" "}
              (compte ou Mobile Money), notifiez ekonzo :
              <div className="mt-2">
                <CodeBlock>{`POST ${apiBase}/payments/notify
Content-Type: application/json

{
  "client_id": "…",
  "client_secret": "…",
  "token": "{token_clair}",
  "notify_ref": "REF-BANQUE-001",
  "channel": "BANK_TRANSFER"
}

→ {
  "status": "COMPLETED",
  "alreadyProcessed": false,
  "subscriptionId": "…",
  "notifyRef": "REF-BANQUE-001",
  "returnUrl": "${publicBase}/…"
}`}</CodeBlock>
              </div>
              <p className="mt-2">
                <code>channel</code> : <code>BANK_TRANSFER</code> ou{" "}
                <code>MOBILE_MONEY</code>. Redirigez ensuite l&apos;investisseur
                vers <code>returnUrl</code>.
              </p>
            </li>
          </ol>
        </section>

        <section id="checklist" className="scroll-mt-24 space-y-3">
          <h2 className="text-base font-semibold text-rdc-navy">
            4. Checklist d&apos;implémentation
          </h2>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>
              <code>GET /oauth/authorize</code> — login client banque + émission
              du <code>code</code>
            </li>
            <li>
              <code>POST /oauth/token</code> — échange{" "}
              <code>code + client_secret</code> → <code>access_token</code>
            </li>
            <li>
              <code>GET /oauth/userinfo</code> — profil compte (champs ci-dessus)
            </li>
            <li>
              <code>paymentUrl</code> — page UI paiement (ekonzo ajoute{" "}
              <code>token</code> + <code>client_id</code>)
            </li>
            <li>
              Client serveur : <code>GET …/payments/sessions</code> +{" "}
              <code>POST …/payments/notify</code>
            </li>
            <li>
              Renseigner les 4 pages dans{" "}
              <code>/bank/pages</code> (pas de paramètres dans l&apos;URL de
              base)
            </li>
            <li>
              <code>client_id</code> / <code>client_secret</code> / code banque
              alignés avec l&apos;écran Intégration
            </li>
          </ul>
        </section>

        <section id="securite" className="scroll-mt-24 space-y-2">
          <h2 className="text-base font-semibold text-rdc-navy">5. Sécurité</h2>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>
              <code>client_id</code> : OK dans les redirections navigateur.
            </li>
            <li>
              <code>client_secret</code> : uniquement serveur (token, sessions,
              notify). Jamais dans une app mobile ou une page publique.
            </li>
            <li>
              Le <code>code</code> OAuth et le <code>token</code> de paiement
              sont des tickets à courte durée — ce ne sont pas des
              access_token.
            </li>
            <li>
              Une banque = un couple de clés unique. Ne partagez pas vos
              credentials avec une autre banque.
            </li>
          </ul>
        </section>
      </article>
    </div>
  );
}
