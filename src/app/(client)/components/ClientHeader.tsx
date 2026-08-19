"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Image from "next/image";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Tableau de bord", icon: "⊞" },
  { href: "/products", label: "Produits", icon: "◈" },
  { href: "/portfolio", label: "Portefeuille", icon: "◎" },
  { href: "/profile", label: "Mon profil", icon: "⊙" },
];

export function ClientHeader({ userName, kycStatus }: { userName: string; kycStatus: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
  }

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 lg:px-6">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-3">
          <Image src="/logo.webp" alt="Ministère des Finances" width={36} height={36} className="object-contain" />
          <div className="hidden sm:block">
            <p className="text-sm font-bold tracking-tight text-primary leading-none">ekonzo</p>
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Bons du Trésor · RDC</p>
          </div>
        </Link>

        {/* Nav desktop */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right section */}
        <div className="flex items-center gap-2">
          {/* KYC badge */}
          {kycStatus !== "VERIFIED" && (
            <span className="hidden sm:flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-medium text-amber-700">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              Identité non vérifiée
            </span>
          )}

          {/* Avatar menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              {initials}
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-11 z-20 w-56 rounded-xl border bg-white shadow-lg py-1">
                  <div className="px-4 py-3 border-b">
                    <p className="text-sm font-semibold truncate">{userName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {kycStatus === "VERIFIED" ? "✓ Identité vérifiée" : "⚠ Vérification en attente"}
                    </p>
                  </div>
                  <Link href="/profile" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted" onClick={() => setMenuOpen(false)}>
                    Mon profil
                  </Link>
                  <div className="border-t mt-1">
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Se déconnecter
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden flex items-center justify-center h-9 w-9 rounded-md hover:bg-muted"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <span className="sr-only">Menu</span>
            <div className="space-y-1.5">
              <span className={`block h-0.5 w-5 bg-foreground transition-transform ${mobileOpen ? "rotate-45 translate-y-2" : ""}`} />
              <span className={`block h-0.5 w-5 bg-foreground transition-opacity ${mobileOpen ? "opacity-0" : ""}`} />
              <span className={`block h-0.5 w-5 bg-foreground transition-transform ${mobileOpen ? "-rotate-45 -translate-y-2" : ""}`} />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-white px-4 py-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium ${
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
