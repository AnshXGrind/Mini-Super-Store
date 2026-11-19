import { redirect } from "next/navigation";
import { getCurrentStoreUser } from "@/lib/auth";

export default async function DashboardRedirectPage() {
  const user = await getCurrentStoreUser();
  if (!user) redirect("/login");
  if (user.role === "admin") redirect("/admin");
  if (user.role === "staff") redirect("/staff");
  redirect("/account");
}