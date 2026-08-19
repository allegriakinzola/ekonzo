import { UsersThreeIcon } from "@phosphor-icons/react/dist/ssr";

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
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { cn } from "@/lib/utils";

const KYC_LABELS: Record<string, string> = {
  PENDING: "Non soumis",
  SUBMITTED: "En attente",
  UNDER_REVIEW: "En révision",
  VERIFIED: "Vérifié",
  APPROVED: "Approuvé",
  REJECTED: "Rejeté",
};

function kycBadgeClass(status: string) {
  switch (status) {
    case "VERIFIED":
    case "APPROVED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "REJECTED":
      return "border-destructive/20 bg-destructive/10 text-destructive";
    case "SUBMITTED":
    case "UNDER_REVIEW":
      return "border-amber-200 bg-amber-50 text-amber-800";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

function roleBadgeClass(role: string) {
  switch (role) {
    case "SUPER_ADMIN":
      return "border-primary/20 bg-primary/10 text-primary";
    case "ADMIN":
      return "border-rdc-navy/20 bg-rdc-navy/10 text-rdc-navy";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

export default async function AdminUsersPage() {
  await requireRole(["ADMIN", "SUPER_ADMIN"]);

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      phoneNumber: true,
      role: true,
      kycStatus: true,
      banned: true,
      createdAt: true,
      _count: { select: { subscriptions: true } },
    },
  });

  const kycVerified = users.filter((u) => u.kycStatus === "VERIFIED").length;
  const kycPending = users.filter((u) => u.kycStatus === "SUBMITTED").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <UsersThreeIcon className="size-5" weight="duotone" />
            <span className="text-xs font-medium uppercase tracking-wide">
              Comptes
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-rdc-navy">
            Utilisateurs
          </h1>
          <p className="text-sm text-muted-foreground">
            {users.length} compte{users.length > 1 ? "s" : ""} · {kycVerified}{" "}
            vérifiés · {kycPending} en attente KYC
          </p>
        </div>
        <Badge variant="outline" className="h-7 px-3 text-xs">
          {users.length} utilisateur{users.length > 1 ? "s" : ""}
        </Badge>
      </div>

      <Card className="border-border/80 bg-card shadow-sm ring-1 ring-rdc-navy/5">
        <CardHeader className="border-b [.border-b]:pb-4">
          <CardTitle className="text-base">Liste des comptes</CardTitle>
          <CardDescription>
            Clients et administrateurs inscrits sur ekonzo
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-muted-foreground">
              Aucun utilisateur.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="px-4">Utilisateur</TableHead>
                  <TableHead className="px-4">Téléphone</TableHead>
                  <TableHead className="px-4">Rôle</TableHead>
                  <TableHead className="px-4">KYC</TableHead>
                  <TableHead className="px-4">Souscriptions</TableHead>
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
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {u.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-medium leading-tight">
                            {u.name}
                          </p>
                          {u.banned && (
                            <p className="text-xs text-destructive">Banni</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-muted-foreground">
                      {u.phoneNumber ?? "—"}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={cn("", roleBadgeClass(u.role))}
                      >
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          "",
                          kycBadgeClass(u.kycStatus),
                        )}
                      >
                        {KYC_LABELS[u.kycStatus] ?? u.kycStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <span
                        className={cn(
                          "text-sm font-semibold",
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
