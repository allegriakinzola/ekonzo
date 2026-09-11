import { redirect } from "next/navigation";

export default function LegacyLinkBankRedirect() {
  redirect("/profile/bank");
}
