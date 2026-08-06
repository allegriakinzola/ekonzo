"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

const NAV_LINKS = [
  { href: "#produits", label: "Produits" },
  { href: "#fonctionnement", label: "Parcours" },
  { href: "#paiements", label: "Paiements" },
  { href: "#faq", label: "FAQ" },
  { href: "#securite", label: "Sécurité" },
] as const;

export function HomeNavbar() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="relative z-50 mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-[4.25rem] lg:px-6">
        <Link href="/" className="group flex min-w-0 items-center gap-2.5 sm:gap-3">
          <Image
            src="/logo.webp"
            alt="Ministère des Finances RDC"
            width={40}
            height={40}
            className="h-8 w-auto object-contain transition-transform group-hover:scale-[1.03] sm:h-10"
            priority
          />
          <div className="min-w-0">
            <p className="text-sm font-bold leading-none tracking-tight text-primary sm:text-[15px]">
              ekonzo
            </p>
            <p className="mt-1 truncate text-[10px] leading-none text-slate-500">
              Bons du Trésor · RDC
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Navigation principale">
          {NAV_LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link
            href="/login"
            className="hidden h-9 items-center rounded-xl px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 sm:inline-flex sm:h-10 sm:px-4"
          >
            Se connecter
          </Link>
          <Link
            href="/register"
            className="inline-flex h-9 items-center rounded-xl bg-primary px-3 text-xs font-semibold text-white shadow-sm shadow-primary/25 transition-all hover:bg-primary/90 sm:h-10 sm:px-4 sm:text-sm"
          >
            <span className="sm:hidden">Compte</span>
            <span className="hidden sm:inline">Ouvrir un compte</span>
          </Link>

          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition-colors hover:bg-slate-100 md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Menu mobile */}
      <div
        id="mobile-nav"
        className={`relative z-50 border-t border-slate-200 bg-white md:hidden ${open ? "block" : "hidden"}`}
      >
        <nav className="mx-auto flex max-w-6xl flex-col px-4 py-3" aria-label="Navigation mobile">
          {NAV_LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-xl px-3 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              onClick={() => setOpen(false)}
            >
              {item.label}
            </a>
          ))}
          <div className="mt-2 grid gap-2 border-t border-slate-100 pt-3 pb-1">
            <Link
              href="/login"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 text-sm font-medium text-slate-700"
              onClick={() => setOpen(false)}
            >
              Se connecter
            </Link>
            <Link
              href="/register"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-white"
              onClick={() => setOpen(false)}
            >
              Ouvrir un compte
            </Link>
          </div>
        </nav>
      </div>

      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/25 md:hidden"
          aria-label="Fermer le menu"
          onClick={() => setOpen(false)}
        />
      )}
    </header>
  );
}
