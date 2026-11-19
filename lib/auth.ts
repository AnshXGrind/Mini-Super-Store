import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type StoreRole = "customer" | "staff" | "admin";

export type CurrentStoreUser = {
  id: string;
  email: string | null;
  role: StoreRole;
};

export async function getCurrentStoreUser(): Promise<CurrentStoreUser | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) return null;
  const userId = data.claims.sub;
  if (typeof userId !== "string") return null;

  const { data: roleRow, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (roleError || !roleRow) return null;
  const role = roleRow.role as StoreRole;
  if (!["customer", "staff", "admin"].includes(role)) return null;

  return {
    id: userId,
    email: typeof data.claims.email === "string" ? data.claims.email : null,
    role,
  };
}

export async function requireStoreRole(allowedRoles: StoreRole[]) {
  const user = await getCurrentStoreUser();
  if (!user) redirect("/login");
  if (!allowedRoles.includes(user.role)) redirect("/dashboard");
  return user;
}