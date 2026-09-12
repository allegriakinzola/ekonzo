import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { requireRole } from "@/lib/session";
import { getActiveBankLink } from "@/modules/banks/bank-link.service";
import { ClientSidebar } from "./components/ClientSidebar";

/** Toujours frais : la présence d'une BankLink change le shell (sidebar / onboarding). */
export const dynamic = "force-dynamic";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole("CLIENT");
  const userName = session.user.name ?? "Utilisateur";
  const bankLink = await getActiveBankLink(session.user.id);

  const hdrs = await headers();
  const pathname = hdrs.get("x-pathname") ?? "";
  const onBankLinkFlow =
    pathname === "/profile/bank" ||
    pathname.startsWith("/profile/bank/") ||
    pathname === "/link-bank" ||
    pathname.startsWith("/link-bank/");

  // Liaison banque obligatoire avant d'accéder au reste de l'app client
  if (!bankLink && !onBankLinkFlow) {
    redirect("/profile/bank");
  }

  // Première liaison : écran focalisé, sans navigation latérale
  if (!bankLink) {
    return (
      <div className="flex min-h-screen flex-col bg-[linear-gradient(180deg,oklch(0.98_0.01_220)_0%,oklch(0.97_0.005_264)_100%)]">
        <div className="h-1 w-full bg-[linear-gradient(90deg,var(--rdc-red)_0%,var(--primary)_45%,var(--rdc-navy)_100%)]" />
        <header className="border-b bg-white/90 px-4 py-4 backdrop-blur sm:px-8">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                Étape obligatoire
              </p>
              <p className="text-sm font-semibold text-rdc-navy">
                Lier une banque partenaire
              </p>
            </div>
            <p className="truncate text-xs text-muted-foreground">{userName}</p>
          </div>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-8">
          {children}
        </main>
        <footer className="border-t py-5 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} ekonzo · Ministère des Finances de la RDC
        </footer>
      </div>
    );
  }

  // Banque liée → structure normale (sidebar + contenu + footer)
  return (
    <div className="flex min-h-screen bg-[linear-gradient(180deg,oklch(0.98_0.01_220)_0%,oklch(0.97_0.005_264)_100%)]">
      <ClientSidebar
        userName={userName}
        bankShortName={bankLink.partnerBank.shortName}
      />
      <div className="flex min-h-screen flex-1 flex-col lg:ml-64">
        <div className="h-1 w-full shrink-0 bg-[linear-gradient(90deg,var(--rdc-red)_0%,var(--primary)_45%,var(--rdc-navy)_100%)]" />
        <div className="h-14 shrink-0 lg:hidden" />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 lg:px-8">
          {children}
        </main>
        <Separator />
        <footer className="shrink-0 py-5 text-center text-xs text-muted-foreground">
          <p>
            © {new Date().getFullYear()} ekonzo · Ministère des Finances de la
            RDC · {bankLink.partnerBank.shortName}
          </p>
        </footer>
      </div>
    </div>
  );
}
