import { redirect } from "next/navigation";

export default function LegacyNewServicePage() {
  redirect("/operations/new");
}
