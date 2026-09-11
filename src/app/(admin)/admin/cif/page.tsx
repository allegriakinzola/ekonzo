import {
  BankIcon,
  DownloadSimpleIcon,
  IdentificationCardIcon,
  LinkBreakIcon,
  ReceiptIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react/dist/ssr";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { Avatar, BankLogo, EmptyState, StatCard } from "@/components/data-display";
import { formatAmount, formatDate } from "@/lib/format";
import { requireRole } from "@/lib/session";
import { cn } from "@/lib/utils";
import { clientActivity, fetchCifClients } from "@/modules/cif/cif.service";

function maskAccount(acc: string) {
  return acc.length > 4 ? `•••• ${acc.slice(-4)}` : acc;
}

export default async function AdminCifPage() {
  await requireRole(["ADMIN", "SUPER_ADMIN"]);

  const clients = await fetchCifClients();
  const withBank = clients.filter((c) => c.bankLink).length;
  const withSubscriptions = clients.filter(
    (c) => c.subscriptions.length > 0,
  ).length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Conformité"
        icon={<IdentificationCardIcon className="size-4" weight="duotone" />}
        title="Fichier client (CIF)"
        description="Dossier de chaque investisseur : identité, banque partenaire liée, compte de règlement et activité de souscription. Export Excel global ou individuel."
        actions={
          <a
            href="/api/admin/cif/export"
            className={cn(buttonVariants({ size: "lg" }), "gap-2")}
          >
            <DownloadSimpleIcon className="size-4" weight="bold" />
            Exporter tout (Excel)
          </a>
        }
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Investisseurs"
          value={clients.length}
          sub="Dossiers CIF"
          icon={<UsersThreeIcon className="size-5" weight="duotone" />}
        />
        <StatCard
          label="Banque liée"
          value={withBank}
          sub={
            clients.length - withBank > 0
              ? `${clients.length - withBank} sans banque partenaire`
              : "Tous les dossiers sont complets"
          }
          icon={<BankIcon className="size-5" weight="duotone" />}
          accent="text-emerald-700 bg-emerald-50 ring-emerald-100"
        />
        <StatCard
          label="Avec souscriptions"
          value={withSubscriptions}
          sub="Au moins une souscription valide"
          icon={<ReceiptIcon className="size-5" weight="duotone" />}
          accent="text-rdc-navy bg-rdc-navy/10 ring-rdc-navy/15"
        />
      </section>

      <Card className="overflow-hidden border-border/80 shadow-sm ring-1 ring-rdc-navy/5">
        <CardHeader className="border-b [.border-b]:pb-4">
          <CardTitle className="text-base">Dossiers</CardTitle>
          <CardDescription>
            Le règlement des souscriptions est effectué exclusivement via la
            banque partenaire liée à l&apos;investisseur.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {clients.length === 0 ? (
            <EmptyState
              icon={<IdentificationCardIcon className="size-6" weight="duotone" />}
              title="Aucun investisseur inscrit"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="min-w-[220px] px-4">Investisseur</TableHead>
                    <TableHead className="min-w-[220px] px-4">
                      Banque partenaire · compte
                    </TableHead>
                    <TableHead className="px-4">Activité</TableHead>
                    <TableHead className="px-4 text-right">Export</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((u) => {
                    const link = u.bankLink;
                    const activity = clientActivity(u);
                    return (
                      <TableRow key={u.id} className="align-top">
                        <TableCell className="px-4 py-4 whitespace-normal">
                          <div className="flex items-start gap-3">
                            <Avatar name={u.name} />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold leading-snug text-rdc-navy">
                                {u.name}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {u.email}
                              </p>
                              <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                                {u.phoneNumber ?? "—"}
                              </p>
                              <p className="mt-1 text-[11px] text-muted-foreground/70">
                                Inscrit le {formatDate(u.createdAt)}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="px-4 py-4 whitespace-normal">
                          {link ? (
                            <div className="flex items-start gap-3">
                              <BankLogo
                                logoUrl={link.partnerBank.logoUrl}
                                shortName={link.partnerBank.shortName}
                              />
                              <div className="min-w-0 text-xs">
                                <p className="text-sm font-medium text-foreground">
                                  {link.partnerBank.name}
                                </p>
                                <p className="mt-0.5 text-muted-foreground">
                                  {link.accountName}
                                </p>
                                <p className="mt-0.5 font-mono text-muted-foreground">
                                  {maskAccount(link.accountNumber)} · {link.currency}
                                </p>
                                <p className="mt-1 text-[11px] text-muted-foreground/70">
                                  Liée le {formatDate(link.linkedAt)}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
                              <LinkBreakIcon className="size-3.5" />
                              Aucune banque liée
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="px-4 py-4 whitespace-normal">
                          <p
                            className={cn(
                              "text-sm font-semibold",
                              activity.count > 0
                                ? "text-primary"
                                : "text-muted-foreground",
                            )}
                          >
                            {activity.count} souscription
                            {activity.count > 1 ? "s" : ""}
                          </p>
                          {activity.count > 0 && (
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              {activity.cdf > 0 && (
                                <p>{formatAmount(activity.cdf, "CDF")}</p>
                              )}
                              {activity.usd > 0 && (
                                <p>{formatAmount(activity.usd, "USD")}</p>
                              )}
                              {activity.last && (
                                <p className="mt-1 text-[11px] text-muted-foreground/70">
                                  Dernière le {formatDate(activity.last)}
                                </p>
                              )}
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="px-4 py-4 text-right">
                          <a
                            href={`/api/admin/cif/export?userId=${u.id}`}
                            className={cn(
                              buttonVariants({ size: "sm", variant: "outline" }),
                              "gap-1.5",
                            )}
                          >
                            <DownloadSimpleIcon className="size-3.5" />
                            Excel
                          </a>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
