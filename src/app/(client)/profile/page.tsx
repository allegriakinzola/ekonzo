import Link from "next/link";
import {
  ArrowRightIcon,
  BankIcon,
  CalendarBlankIcon,
  EnvelopeSimpleIcon,
  GearSixIcon,
  IdentificationCardIcon,
  LockIcon,
  PhoneIcon,
  ReceiptIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react/dist/ssr";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { isUsableLogoUrl } from "@/lib/logo";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { getActiveBankLink } from "@/modules/banks/bank-link.service";
import { InfoList, InfoRow } from "@/components/info-list";
import { PageHeader } from "@/components/page-header";

export default async function ProfilePage() {
  const session = await requireRole("CLIENT");

  const [user, bankLink, subscriptionCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        nom: true,
        postnom: true,
        prenom: true,
        email: true,
        phoneNumber: true,
        createdAt: true,
      },
    }),
    getActiveBankLink(session.user.id),
    prisma.subscription.count({
      where: {
        userId: session.user.id,
        status: { notIn: ["FAILED", "CANCELLED"] },
      },
    }),
  ]);

  if (!user) return null;

  const initials = (user.prenom || user.name)
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        eyebrow="Paramètres"
        icon={<GearSixIcon className="size-4" weight="duotone" />}
        title="Mon compte"
        description="Vos informations personnelles et la banque partenaire utilisée pour vos souscriptions."
      />

      {/* Identité */}
      <Card className="ring-1 ring-rdc-navy/5">
        <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--primary)_0%,var(--rdc-navy)_100%)] text-xl font-bold text-white shadow-sm">
            {initials}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-semibold text-rdc-navy">
                {user.name}
              </h2>
              <Badge
                variant="outline"
                className="border-emerald-200 bg-emerald-50 text-emerald-700"
              >
                Investisseur
              </Badge>
            </div>
            <p className="truncate text-sm text-muted-foreground">
              {user.email}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-6 border-t pt-4 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6">
            <Kpi label="Souscriptions" value={subscriptionCount} />
            <Kpi
              label="Membre depuis"
              value={new Date(user.createdAt).getFullYear()}
            />
          </div>
        </CardContent>
      </Card>

      {/* Informations */}
      <Card className="ring-1 ring-rdc-navy/5">
        <CardHeader className="border-b [.border-b]:pb-4">
          <div className="flex items-center gap-3">
            <SectionIcon>
              <IdentificationCardIcon className="size-4" weight="duotone" />
            </SectionIcon>
            <div>
              <CardTitle className="text-base">Informations personnelles</CardTitle>
              <CardDescription>
                Données de votre compte ekonzo
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-1">
          <InfoList>
            <InfoRow
              label="Nom"
              icon={<IdentificationCardIcon className="size-3.5" />}
              value={user.nom || "—"}
            />
            <InfoRow
              label="Postnom"
              icon={<IdentificationCardIcon className="size-3.5" />}
              value={user.postnom || "—"}
            />
            <InfoRow
              label="Prénom"
              icon={<IdentificationCardIcon className="size-3.5" />}
              value={user.prenom || "—"}
            />
            <InfoRow
              label="Adresse e-mail"
              icon={<EnvelopeSimpleIcon className="size-3.5" />}
              value={user.email ?? "—"}
            />
            <InfoRow
              label="Téléphone"
              icon={<PhoneIcon className="size-3.5" />}
              value={user.phoneNumber ?? "—"}
              muted={!user.phoneNumber}
            />
            <InfoRow
              label="Inscription"
              icon={<CalendarBlankIcon className="size-3.5" />}
              value={formatDate(user.createdAt)}
            />
            <InfoRow
              label="Souscriptions"
              icon={<ReceiptIcon className="size-3.5" />}
              value={`${subscriptionCount} au total`}
            />
          </InfoList>
        </CardContent>
      </Card>

      {/* Banque partenaire */}
      <Card className="ring-1 ring-rdc-navy/5">
        <CardHeader className="border-b [.border-b]:pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <SectionIcon>
                <BankIcon className="size-4" weight="duotone" />
              </SectionIcon>
              <div>
                <CardTitle className="text-base">Banque partenaire</CardTitle>
                <CardDescription>
                  Compte teneur utilisé pour régler vos souscriptions
                </CardDescription>
              </div>
            </div>
            <Badge
              variant="outline"
              className={
                bankLink
                  ? "shrink-0 border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "shrink-0 border-amber-200 bg-amber-50 text-amber-800"
              }
            >
              {bankLink ? "Liée" : "Non liée"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-1">
          {bankLink ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 pt-3">
                <BankLogo
                  logoUrl={bankLink.partnerBank.logoUrl}
                  shortName={bankLink.partnerBank.shortName}
                />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-rdc-navy">
                    {bankLink.partnerBank.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {bankLink.partnerBank.shortName} · liée le{" "}
                    {formatDate(bankLink.linkedAt)}
                  </p>
                </div>
              </div>
              <InfoList className="border-t">
                <InfoRow label="Titulaire" value={bankLink.accountName} />
                <InfoRow
                  label="Numéro de compte"
                  value={bankLink.accountNumber}
                  mono
                />
                <InfoRow label="Devise du compte" value={bankLink.currency} />
              </InfoList>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-100">
                <BankIcon className="size-6" weight="duotone" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-rdc-navy">
                  Aucune banque liée
                </p>
                <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
                  Les souscriptions aux titres publics passent par votre
                  banque. Liez-la pour pouvoir souscrire.
                </p>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="justify-between gap-3 bg-muted/30">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheckIcon className="size-3.5" weight="duotone" />
            Connexion sécurisée via votre banque
          </p>
          <Button
            size="sm"
            variant={bankLink ? "outline" : "default"}
            render={<Link href="/profile/bank" />}
          >
            {bankLink ? "Changer de banque" : "Lier ma banque"}
            <ArrowRightIcon className="size-3.5" weight="bold" />
          </Button>
        </CardFooter>
      </Card>

      {/* Sécurité */}
      <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/30 px-4 py-3.5 text-xs leading-relaxed text-muted-foreground">
        <LockIcon className="mt-0.5 size-4 shrink-0" weight="duotone" />
        <p>
          <span className="font-medium text-foreground">Sécurité.</span> Pour
          modifier vos informations personnelles ou votre mot de passe,
          contactez le support ekonzo.
        </p>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-[88px]">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-xl font-bold tracking-tight text-rdc-navy">
        {value}
      </p>
    </div>
  );
}

function SectionIcon({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
      {children}
    </div>
  );
}

function BankLogo({
  logoUrl,
  shortName,
}: {
  logoUrl: string | null;
  shortName: string;
}) {
  return isUsableLogoUrl(logoUrl) ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl}
      alt={shortName}
      className="size-12 shrink-0 rounded-lg border bg-white object-contain p-1"
    />
  ) : (
    <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border bg-white text-sm font-bold text-rdc-navy">
      {shortName.slice(0, 2).toUpperCase()}
    </div>
  );
}
