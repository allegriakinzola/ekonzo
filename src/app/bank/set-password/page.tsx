import { Suspense } from "react";
import BankSetPasswordPage from "./SetPasswordForm";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          Chargement…
        </div>
      }
    >
      <BankSetPasswordPage />
    </Suspense>
  );
}
