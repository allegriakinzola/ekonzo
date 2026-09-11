import { UsersThreeIcon } from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/session";
import {
  getPartnerBankForStaffUser,
  listBankCustomers,
} from "@/modules/banks/bank-link.service";
import { CustomersManager, type CustomerRow } from "./CustomersManager";

export default async function BankCustomersPage() {
  const session = await requireRole("BANK", "/bank/login");
  const bank = await getPartnerBankForStaffUser(session.user.id);
  if (!bank) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucune banque associée à ce compte.
      </p>
    );
  }

  const customers = await listBankCustomers(bank.id);
  const rows: CustomerRow[] = customers.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <UsersThreeIcon className="size-5" weight="duotone" />
            <span className="text-xs font-medium uppercase tracking-wide">
              Simulation
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-rdc-navy">
            Clients bancaires
          </h1>
          <p className="text-sm text-muted-foreground">
            Créez les clients {bank.shortName} qui pourront se connecter depuis
            ekonzo via l&apos;interopérabilité OAuth.
          </p>
        </div>
        <Badge variant="outline" className="h-7 px-3 text-xs">
          {rows.length} client{rows.length > 1 ? "s" : ""}
        </Badge>
      </div>

      <CustomersManager initialCustomers={rows} />
    </div>
  );
}
