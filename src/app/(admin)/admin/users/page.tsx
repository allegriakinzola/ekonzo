import {
  BankIcon,
  LinkBreakIcon,
  ShieldCheckIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react/dist/ssr";

import { Badge } from "@/components/ui/badge";
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
import {
  DISCARDED_STATUSES,
  ROLE_LABELS,
  roleClass,
} from "@/components/status-badges";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { cn } from "@/lib/utils";

function maskAccount(acc: string) {
  return acc.length > 4 ? `•••• ${acc.slice(-4)}` : acc;
}

export default async function AdminUsersPage() {
  await requireRole(["ADMIN", "SUPER_ADMIN"]);

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      role: true,
      banned: true,
      createdAt: true,
      _count: {
        select: {
          subscriptions: {
            where: { status: { notIn: DISCARDED_STATUSES } },
          },
        },
      },
      bankLink: {
        select: {
          accountNumber: true,
          currency: true,
          linkedAt: true,
          partnerBank: {
            select: { shortName: true, name: true, logoUrl: true },
          },
        },
      },
    },
  });

  const clients = users.filter((u) => u.role === "CLIENT");
  const linked = clients.filter((u) => u.bankLink).length;
  const staff = users.length - clients.length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Comptes"
        icon={<UsersThreeIcon className="size-4" weight="duotone" />}
        title="Utilisateurs"
        description="Investisseurs inscrits sur ekonzo, banque partenaire à laquelle chacun est lié, et comptes du Ministère et des banques."
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Investisseurs"
          value={clients.length}
          sub={`${users.length} compte${users.length > 1 ? "s" : ""} au total`}
          icon={<UsersThreeIcon className="size-5" weight="duotone" />}
        />
        <StatCard
          label="Banque liée"
          value={linked}
          sub={
            clients.length - linked > 0
              ? `${clients.length - linked} sans banque`
              : "Tous les investisseurs sont liés"
          }
          icon={<BankIcon className="size-5" weight="duotone" />}
          accent="text-emerald-700 bg-emerald-50 ring-emerald-100"
        />
        <StatCard
          label="Ministère & banques"
          value={staff}
          sub="Administrateurs et comptes banque"
          icon={<ShieldCheckIcon className="size-5" weight="duotone" />}
          accent="text-rdc-navy bg-rdc-navy/10 ring-rdc-navy/15"
        />
      </section>

      <Card className="border-border/80 bg-card shadow-sm ring-1 ring-rdc-navy/5">
        <CardHeader className="border-b [.border-b]:pb-4">
          <CardTitle className="text-base">Liste des comptes</CardTitle>
          <CardDescription>
            Les souscriptions comptabilisées excluent les tentatives échouées
            ou annulées.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <EmptyState
              icon={<UsersThreeIcon className="size-6" weight="duotone" />}
              title="Aucun utilisateur"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="px-4">Utilisateur</TableHead>
                  <TableHead className="px-4">Rôle</TableHead>
                  <TableHead className="px-4">Banque partenaire</TableHead>
                  <TableHead className="px-4 text-right">Souscriptions</TableHead>
                  <TableHead className="px-4">Inscrit le</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow
                    key={u.id}
                    className={cn(u.banned && "opacity-50")}
                  >
                    <TableCell className="px-4 py-3 whitespace-normal">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={u.name} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium leading-tight">
                            {u.name}
                            {u.banned && (
                              <span className="ml-2 text-xs font-normal text-destructive">
                                Banni
                              </span>
                            )}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {u.email}
                            {u.phoneNumber ? ` · ${u.phoneNumber}` : ""}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={cn(roleClass(u.role))}
                      >
                        {ROLE_LABELS[u.role] ?? u.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-normal">
                      {u.role !== "CLIENT" ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : u.bankLink ? (
                        <div className="flex items-center gap-2">
                          <BankLogo
                            logoUrl={u.bankLink.partnerBank.logoUrl}
                            shortName={u.bankLink.partnerBank.shortName}
                            size="sm"
                          />
                          <div className="leading-tight">
                            <p className="text-sm font-medium">
                              {u.bankLink.partnerBank.shortName}
                            </p>
                            <p className="font-mono text-[11px] text-muted-foreground">
                              {maskAccount(u.bankLink.accountNumber)} ·{" "}
                              {u.bankLink.currency}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
                          <LinkBreakIcon className="size-3.5" />
                          Non liée
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      <span
                        className={cn(
                          "text-sm font-semibold tabular-nums",
                          u._count.subscriptions > 0
                            ? "text-primary"
                            : "text-muted-foreground",
                        )}
                      >
                        {u._count.subscriptions}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-muted-foreground">
                      {formatDate(u.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
