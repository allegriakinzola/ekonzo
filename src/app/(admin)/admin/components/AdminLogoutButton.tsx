"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function AdminLogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await authClient.signOut();
    router.push("/login");
  }

  return (
    <button
      onClick={handleLogout}
      className="text-sm text-muted-foreground hover:text-destructive transition-colors"
    >
      Déconnexion
    </button>
  );
}
