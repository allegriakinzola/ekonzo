"use client";

import Link from "next/link";
import { WarningCircleIcon } from "@phosphor-icons/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AppSidebar } from "@/components/AppSidebar";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Tableau de bord",
    exact: true,
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  },
  {
    href: "/products",
    label: "Produits",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  },
  {
    href: "/portfolio",
    label: "Portefeuille",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  },
  {
    href: "/settlement",
    label: "Règlement",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>,
  },
  {
    href: "/kyc",
    label: "Mon identité",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>,
  },
  {
    href: "/profile",
    label: "Mon profil",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  },
];

interface ClientSidebarProps {
  userName: string;
  kycStatus: string;
  conventionSigned?: boolean;
}

export function ClientSidebar({
  userName,
  kycStatus,
  conventionSigned = false,
}: ClientSidebarProps) {
  const verified = kycStatus === "VERIFIED";
  const ready = conventionSigned && verified;
  return (
    <AppSidebar
      userName={userName}
      statusLabel={
        ready
          ? "Compte prêt"
          : !conventionSigned
            ? "Convention à signer"
            : "Identité non vérifiée"
      }
      statusColor={ready ? "emerald" : "amber"}
      navItems={[
        ...NAV_ITEMS.slice(0, 3),
        {
          href: "/convention",
          label: "Compte-titres",
          icon: (
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          ),
        },
        ...NAV_ITEMS.slice(3),
      ]}
      alert={
        !conventionSigned ? (
          <Alert className="border-amber-200 bg-amber-50 text-amber-950">
            <WarningCircleIcon className="size-4 text-amber-700" weight="fill" />
            <AlertTitle className="text-amber-900">Convention requise</AlertTitle>
            <AlertDescription className="text-amber-800">
              <Button
                render={<Link href="/convention" />}
                size="sm"
                className="mt-2 bg-amber-700 text-white hover:bg-amber-800"
              >
                Signer
              </Button>
            </AlertDescription>
          </Alert>
        ) : !verified ? (
          <Alert className="border-amber-200 bg-amber-50 text-amber-950">
            <WarningCircleIcon className="size-4 text-amber-700" weight="fill" />
            <AlertTitle className="text-amber-900">Identité non vérifiée</AlertTitle>
            <AlertDescription className="text-amber-800">
              <Button
                render={<Link href="/kyc" />}
                size="sm"
                className="mt-2 bg-amber-700 text-white hover:bg-amber-800"
              >
                Vérifier
              </Button>
            </AlertDescription>
          </Alert>
        ) : undefined
      }
    />
  );
}
