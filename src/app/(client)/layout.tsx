import { requireRole } from "@/lib/session";
import { ClientSidebar } from "./components/ClientSidebar";
import { prisma } from "@/lib/prisma";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole("CLIENT");
  const userName = session.user.name ?? "Utilisateur";
  const freshUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { kycStatus: true },
  });
  const kycStatus = freshUser?.kycStatus ?? "PENDING";

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <ClientSidebar userName={userName} kycStatus={kycStatus} />
      <div className="flex-1 flex flex-col lg:ml-64">
        {/* Mobile top-bar offset */}
        <div className="lg:hidden h-14" />
        <main className="flex-1 px-4 lg:px-8 py-8 max-w-5xl w-full mx-auto">
          {children}
        </main>
        <footer className="border-t py-5 text-center text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} ekonzo · Ministère des Finances de la RDC · Tous droits réservés</p>
        </footer>
      </div>
    </div>
  );
}
