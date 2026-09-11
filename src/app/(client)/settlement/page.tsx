import { redirect } from "next/navigation";

/** Ancien profil de règlement — remplacé par la banque partenaire. */
export default function SettlementRedirectPage() {
  redirect("/profile/bank");
}
