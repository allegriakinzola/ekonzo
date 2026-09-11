"use client";

import {
  BuildingsIcon,
  ChartBarIcon,
  IdentificationCardIcon,
  ReceiptIcon,
  SquaresFourIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";

import { AppSidebar } from "@/components/AppSidebar";

const NAV_ITEMS = [
  {
    href: "/admin",
    label: "Vue d'ensemble",
    exact: true,
    icon: <SquaresFourIcon className="size-5" weight="duotone" />,
  },
  {
    href: "/admin/products",
    label: "Émissions",
    icon: <ChartBarIcon className="size-5" weight="duotone" />,
  },
  {
    href: "/admin/subscriptions",
    label: "Souscriptions",
    icon: <ReceiptIcon className="size-5" weight="duotone" />,
  },
  {
    href: "/admin/banks",
    label: "Banques partenaires",
    icon: <BuildingsIcon className="size-5" weight="duotone" />,
  },
  {
    href: "/admin/users",
    label: "Utilisateurs",
    icon: <UsersThreeIcon className="size-5" weight="duotone" />,
  },
  {
    href: "/admin/cif",
    label: "Fichier client (CIF)",
    icon: <IdentificationCardIcon className="size-5" weight="duotone" />,
  },
];

interface AdminSidebarProps {
  userName: string;
  role: string;
}

export function AdminSidebar({ userName, role }: AdminSidebarProps) {
  const roleLabel = role === "SUPER_ADMIN" ? "Super admin" : "Administrateur";
  return (
    <AppSidebar
      userName={userName}
      statusLabel={`Ministère des Finances · ${roleLabel}`}
      statusColor="slate"
      navItems={NAV_ITEMS}
      logoutHref="/ministry/login"
    />
  );
}
