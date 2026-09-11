import {
  BuildingsIcon,
  LinkIcon,
  SealCheckIcon,
} from "@phosphor-icons/react/dist/ssr";

import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/data-display";
import { requireRole } from "@/lib/session";
import { listPartnerBanks } from "@/modules/banks/bank.service";
import { BanksManager, type BankRow } from "./BanksManager";

export default async function AdminBanksPage() {
  await requireRole(["ADMIN", "SUPER_ADMIN"]);
  const banks = await listPartnerBanks();

  const rows: BankRow[] = banks.map((b) => ({
    id: b.id,
    code: b.code,
    name: b.name,
    shortName: b.shortName,
    email: b.email,
    logoUrl: b.logoUrl,
    isActive: b.isActive,
    interopMode: b.interopMode,
    activatedAt: b.activatedAt?.toISOString() ?? null,
    createdAt: b.createdAt.toISOString(),
    linkedClients: b._count.links,
    paidPayments: b._count.paymentSessions,
  }));

  const active = rows.filter((b) => b.isActive && b.activatedAt).length;
  const linked = rows.reduce((sum, b) => sum + b.linkedClients, 0);
  const paid = rows.reduce((sum, b) => sum + b.paidPayments, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Partenaires"
        icon={<BuildingsIcon className="size-4" weight="duotone" />}
        title="Banques partenaires"
        description="Banques commerciales agréées : elles authentifient les investisseurs, règlent les souscriptions (compte bancaire ou Mobile Money) et notifient ekonzo. Créez le compte avec e-mail et mot de passe, puis gérez le logo affiché."
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Banques actives"
          value={active}
          sub={`${rows.length} banque${rows.length > 1 ? "s" : ""} enregistrée${rows.length > 1 ? "s" : ""}`}
          icon={<BuildingsIcon className="size-5" weight="duotone" />}
          accent="text-emerald-700 bg-emerald-50 ring-emerald-100"
        />
        <StatCard
          label="Investisseurs liés"
          value={linked}
          sub="Liaisons bancaires actives"
          icon={<LinkIcon className="size-5" weight="duotone" />}
        />
        <StatCard
          label="Paiements réglés"
          value={paid}
          sub="Notifiés par les banques"
          icon={<SealCheckIcon className="size-5" weight="duotone" />}
          accent="text-rdc-navy bg-rdc-navy/10 ring-rdc-navy/15"
        />
      </section>

      <BanksManager initialBanks={rows} />
    </div>
  );
}
