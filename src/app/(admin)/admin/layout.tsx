import { requireRole } from "@/lib/session";
import { AdminSidebar } from "./components/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole(["ADMIN", "SUPER_ADMIN"]);
  const userName = session.user.name ?? "Administrateur";
  const role = (session.user as { role?: string }).role ?? "ADMIN";

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <AdminSidebar userName={userName} role={role} />
      <div className="flex-1 flex flex-col lg:ml-64">
        <div className="lg:hidden h-14" />
        <main className="flex-1 px-4 lg:px-8 py-8 max-w-5xl w-full mx-auto">
          {children}
        </main>
        <footer className="border-t py-5 text-center text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} ekonzo · Ministère des Finances de la RDC</p>
        </footer>
      </div>
    </div>
  );
}
