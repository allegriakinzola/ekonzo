import { redirect } from "next/navigation";

/** Ancienne page « Mon identité » — KYC géré à l'inscription. */
export default function KycPageRedirect() {
  redirect("/profile");
}
