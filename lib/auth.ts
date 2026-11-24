import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type StoreRole = "customer" | "staff" | "admin";

export type CurrentStoreUser = {
  id: string;
  email: string | null;
  role: StoreRole;
};

export async function getCurrentStoreUser(): Promise<CurrentStoreUser | null> {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return null;
  }

  let userId: string | null = null;
  let email: string | null = null;
  try {
    const { data, error } = await supabase.auth.getClaims();
    if (error) return null;
    const claims = data?.claims;
    if (!claims || typeof claims.sub !== "string") return null;
    userId = claims.sub;
    email = typeof claims.email === "string" ? claims.email : null;
  } catch {
    return null;
  }

  if (!userId) return null;

  const { data: roleRow, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (roleError || !roleRow) return null;
  const role = roleRow.role as StoreRole;
  if (!["customer", "staff", "admin"].includes(role)) return null;

  return { id: userId, email, role };
}

export async function requireStoreRole(allowedRoles: StoreRole[]) {
  const user = await getCurrentStoreUser();
  if (!user) redirect("/login");
  if (!allowedRoles.includes(user.role)) redirect("/dashboard");
  return user;
}