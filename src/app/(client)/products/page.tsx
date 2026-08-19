import Link from "next/link";
import {
  IdentificationCardIcon,
  ListBulletsIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/dist/ssr";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { formatAmount, formatDate, daysUntil } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import {
  getCommittedVolumes,
  volumeLeft as calcVolumeLeft,
} from "@/lib/product-volume";
import { getUserKycStatus, hasSignedConvention, requireRole } from "@/lib/session";
import { cn } from "@/lib/utils";

export default async function ProductsPage() {
  const session = await requireRole("CLIENT");
  const kycVerified = (await getUserKycStatus(session.user.id)) === "VERIFIED";
  const conventionSigned = await hasSignedConvention(session.user.id);
  const canSubscribe = kycVerified && conventionSigned;

  const products = await prisma.product.findMany({
    where: { status: "OPEN" },
    orderBy: { subscriptionDeadline: "asc" },
    select: {
      id: true,
      code: true,
      currency: true,
      minTicket: true,
      discountRate: true,
      issuanceDate: true,
      maturityDate: true,
      subscriptionDeadline: true,
      totalVolume: true,
    },
  });
  const committedMap = await getCommittedVolumes(products.map((p) => p.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <ListBulletsIcon className="size-5" weight="duotone" />
            <span className="text-xs font-medium uppercase tracking-wide">
              Marché
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-rdc-navy">
            Produits disponibles
          </h1>
          <p className="text-sm text-muted-foreground">
            Bons du Trésor émis par le Ministère des Finances · RDC
          </p>
        </div>
        <Badge variant="outline" className="h-7 px-3 text-xs">
          {products.length} produit{products.length > 1 ? "s" : ""}
        </Badge>
      </div>

      {!conventionSigned && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-950">
          <WarningCircleIcon className="size-4 text-amber-700" weight="fill" />
          <AlertTitle className="text-amber-900">
            Convention de compte-titres requise
          </AlertTitle>
          <AlertDescription className="flex flex-col gap-3 text-amber-800 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Signez la convention électronique pour ouvrir votre compte-titres
              auprès de la banque partenaire.
            </span>
            <Button
              render={<Link href="/convention" />}
              size="sm"
              className="bg-amber-700 text-white hover:bg-amber-800"
            >
              Signer la convention
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {conventionSigned && !kycVerified && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-950">
          <WarningCircleIcon className="size-4 text-amber-700" weight="fill" />
          <AlertTitle className="text-amber-900">
            Vérification d&apos;identité requise
          </AlertTitle>
          <AlertDescription className="flex flex-col gap-3 text-amber-800 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Vous devez compléter votre KYC avant de pouvoir souscrire à un
              produit.
            </span>
            <Button
              render={<Link href="/profile" />}
              size="sm"
              className="bg-amber-700 text-white hover:bg-amber-800"
            >
              <IdentificationCardIcon className="size-4" />
              Voir mon profil
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {products.length === 0 ? (
        <Card className="ring-1 ring-rdc-navy/5">
          <CardContent className="py-16 text-center">
            <p className="font-semibold text-base">
              Aucun produit ouvert pour le moment
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Les prochaines émissions de Bons du Trésor apparaîtront ici.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {products.map((p) => {
            const days = daysUntil(p.subscriptionDeadline);
            const rate = p.discountRate;
            const rateLabel = "Taux d'escompte";
            const committed = committedMap.get(p.id) ?? 0;
            const volumeLeft = calcVolumeLeft(p.totalVolume.toString(), committed);
            const pct = Math.round((committed / Number(p.totalVolume)) * 100);

            return (
              <Card
                key={p.id}
                className="flex flex-col ring-1 ring-rdc-navy/5"
              >
                <CardHeader className="border-b [.border-b]:pb-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <Badge
                        variant="outline"
                        className="border-primary/20 bg-primary/10 text-primary"
                      >
                        Bon du Trésor
                      </Badge>
                      <CardDescription className="font-mono">
                        {p.code}
                      </CardDescription>
                    </div>
                    {days <= 3 ? (
                      <Badge
                        variant="outline"
                        className="border-destructive/20 bg-destructive/10 text-destructive"
                      >
                        {days}j restant{days > 1 ? "s" : ""}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {days}j restants
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-base sr-only">{p.code}</CardTitle>
                </CardHeader>

                <CardContent className="flex-1 space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Stat
                      label="Montant total"
                      value={formatAmount(p.totalVolume.toString(), p.currency)}
                    />
                    <Stat
                      label="Ticket minimum"
                      value={formatAmount(p.minTicket.toString(), p.currency)}
                    />
                    <Stat
                      label={rateLabel}
                      value={
                        rate ? `${(Number(rate) * 100).toFixed(2)} %` : "—"
                      }
                      highlight
                    />
                    <Stat
                      label="Disponible"
                      value={formatAmount(volumeLeft.toString(), p.currency)}
                    />
                    <Stat label="Émission" value={formatDate(p.issuanceDate)} />
                    <Stat label="Maturité" value={formatDate(p.maturityDate)} />
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Volume disponible
                      </span>
                      <span className="text-xs font-medium">{pct}% alloué</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatAmount(volumeLeft.toString(), p.currency)}{" "}
                      disponibles
                    </p>
                  </div>
                </CardContent>

                <CardFooter>
                  {canSubscribe ? (
                    <Button
                      className="w-full"
                      size="lg"
                      render={<Link href={`/products/${p.id}`} />}
                    >
                      Souscrire
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      size="lg"
                      render={
                        <Link
                          href={
                            !conventionSigned ? "/convention" : "/profile"
                          }
                        />
                      }
                    >
                      {!conventionSigned
                        ? "Signer la convention"
                        : "KYC requis pour souscrire"}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/50 px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-sm font-semibold",
          highlight && "text-primary",
        )}
      >
        {value}
      </p>
    </div>
  );
}
