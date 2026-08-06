"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export interface SidebarNavItem {
  href: string;
  label: string;
  exact?: boolean;
  icon: React.ReactNode;
}

export interface AppSidebarProps {
  userName: string;
  statusLabel: string;
  statusColor: "emerald" | "amber" | "violet" | "slate";
  navItems: SidebarNavItem[];
  alert?: React.ReactNode;
}

const STATUS_COLORS = {
  emerald: "text-emerald-600",
  amber: "text-amber-600",
  violet: "text-violet-600",
  slate: "text-slate-500",
};

export function AppSidebar({
  userName,
  statusLabel,
  statusColor,
  navItems,
  alert,
}: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b">
        <Image
          src="/logo.webp"
          alt="ekonzo"
          width={36}
          height={36}
          className="object-contain flex-shrink-0"
        />
        <div>
          <p className="text-sm font-bold tracking-tight text-primary leading-none">
            ekonzo
          </p>
          <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
            Ministère des Finances · RDC
          </p>
        </div>
      </div>

      {/* Alert slot (ex: KYC non vérifié) */}
      {alert && <div className="mx-3 mt-4">{alert}</div>}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-slate-100"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User + logout */}
      <div className="border-t px-3 py-4 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white text-xs font-bold">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate leading-tight">{userName}</p>
            <p className={`text-xs leading-tight mt-0.5 ${STATUS_COLORS[statusColor]}`}>
              {statusLabel}
            </p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          Se déconnecter
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 fixed inset-y-0 left-0 border-r bg-white z-30">
        {sidebarContent}
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between h-14 px-4 border-b bg-white">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.webp" alt="ekonzo" width={28} height={28} className="object-contain" />
          <span className="text-sm font-bold text-primary">ekonzo</span>
        </Link>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center justify-center h-9 w-9 rounded-lg hover:bg-muted transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile overlay */}
      {open && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <aside className="lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-white flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <span className="text-sm font-bold text-primary">ekonzo</span>
              <button
                onClick={() => setOpen(false)}
                className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{sidebarContent}</div>
          </aside>
        </>
      )}
    </>
  );
}
