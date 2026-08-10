import { Separator } from "@/components/ui/separator";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getUserKycStatus, hasSignedConvention, requireRole } from "@/lib/session";
import { ClientSidebar } from "./components/ClientSidebar";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole("CLIENT");
  const userName = session.user.name ?? "Utilisateur";
  const kycStatus = await getUserKycStatus(session.user.id);
  const conventionSigned = await hasSignedConvention(session.user.id);

  const pathname = (await headers()).get("x-pathname") ?? "";
  const onConvention = pathname === "/convention" || pathname.startsWith("/convention/");

  if (!conventionSigned && !onConvention) {
    redirect("/convention");
  }

  // Tant que la convention n'est pas signée : écran bloqué, sans navigation.
  if (!conventionSigned) {
    return (
      <div className="flex min-h-screen flex-col bg-[linear-gradient(180deg,oklch(0.98_0.01_220)_0%,oklch(0.97_0.005_264)_100%)]">
        <div className="h-1 w-full bg-[linear-gradient(90deg,var(--rdc-red)_0%,var(--primary)_45%,var(--rdc-navy)_100%)]" />
        <header className="border-b bg-white/80 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-primary">
                Étape obligatoire
              </p>
              <p className="text-sm font-semibold text-rdc-navy">
                Ouverture du compte-titres
              </p>
            </div>
            <p className="truncate text-xs text-muted-foreground">{userName}</p>
          </div>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">{children}</main>
        <footer className="py-5 text-center text-xs text-muted-foreground">
          <p>
            © {new Date().getFullYear()} ekonzo · Ministère des Finances de la
            RDC
          </p>
        </footer>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[linear-gradient(180deg,oklch(0.98_0.01_220)_0%,oklch(0.97_0.005_264)_100%)]">
      <ClientSidebar
        userName={userName}
        kycStatus={kycStatus}
        conventionSigned={conventionSigned}
      />
      <div className="flex flex-1 flex-col lg:ml-64">
        <div className="h-1 w-full bg-[linear-gradient(90deg,var(--rdc-red)_0%,var(--primary)_45%,var(--rdc-navy)_100%)]" />
        <div className="lg:hidden h-14" />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 lg:px-8">
          {children}
        </main>
        <Separator />
        <footer className="py-5 text-center text-xs text-muted-foreground">
          <p>
            © {new Date().getFullYear()} ekonzo · Ministère des Finances de la
            RDC
          </p>
        </footer>
      </div>
    </div>
  );
}
