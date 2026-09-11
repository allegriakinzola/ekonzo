import { Suspense } from "react";
import { requireRole } from "@/lib/session";
import LinkBankCallbackClient from "./CallbackClient";

export default async function LinkBankCallbackPage() {
  await requireRole("CLIENT");
  return (
    <Suspense
      fallback={
        <div className="py-16 text-center text-sm text-muted-foreground">
          Chargement…
        </div>
      }
    >
      <LinkBankCallbackClient />
    </Suspense>
  );
}
