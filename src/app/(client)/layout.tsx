import { Separator } from "@/components/ui/separator";
import { requireRole } from "@/lib/session";
import { getActiveBankLink } from "@/modules/banks/bank-link.service";
import { ClientSidebar } from "./components/ClientSidebar";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole("CLIENT");
  const userName = session.user.name ?? "Utilisateur";
  const bankLink = await getActiveBankLink(session.user.id);

  return (
    <div className="flex min-h-screen bg-[linear-gradient(180deg,oklch(0.98_0.01_220)_0%,oklch(0.97_0.005_264)_100%)]">
      <ClientSidebar
        userName={userName}
        bankShortName={bankLink?.partnerBank.shortName}
      />
      <div className="flex flex-1 flex-col lg:ml-64">
        <div className="h-1 w-full bg-[linear-gradient(90deg,var(--rdc-red)_0%,var(--primary)_45%,var(--rdc-navy)_100%)]" />
        <div className="h-14 lg:hidden" />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 lg:px-8">
          {children}
        </main>
        <Separator />
        <footer className="py-5 text-center text-xs text-muted-foreground">
          <p>
            © {new Date().getFullYear()} ekonzo · Ministère des Finances de la
            RDC
            {bankLink ? ` · ${bankLink.partnerBank.shortName}` : ""}
          </p>
        </footer>
      </div>
    </div>
  );
}
