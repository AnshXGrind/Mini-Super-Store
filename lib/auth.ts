import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isTemporaryAuthFailure } from "@/lib/auth-error";

export type StoreRole = "customer" | "staff" | "admin";

export type CurrentStoreUser = {
  id: string;
  email: string | null;
  role: StoreRole;
};

export type CurrentStoreUserResult =
  | { status: "authenticated"; user: CurrentStoreUser }
  | { status: "unauthenticated" }
  | { status: "invalid-role" }
  | { status: "unavailable" };

export async function getCurrentStoreUserResult(): Promise<CurrentStoreUserResult> {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return { status: "unavailable" };
  }

  let claims;
  try {
    const result = await supabase.auth.getClaims();
    if (result.error) {
      return isTemporaryAuthFailure(result.error)
        ? { status: "unavailable" }
        : { status: "unauthenticated" };
    }
    claims = result.data?.claims;
  } catch (error) {
    return isTemporaryAuthFailure(error)
      ? { status: "unavailable" }
      : { status: "unauthenticated" };
  }

  if (!claims || typeof claims.sub !== "string") {
    return { status: "unauthenticated" };
  }

  let roleRow;
  try {
    const result = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", claims.sub)
      .maybeSingle();
    if (result.error) return { status: "unavailable" };
    roleRow = result.data;
  } catch {
    return { status: "unavailable" };
  }

  if (!roleRow || !["customer", "staff", "admin"].includes(roleRow.role)) {
    return { status: "invalid-role" };
  }

  return {
    status: "authenticated",
    user: {
      id: claims.sub,
      email: typeof claims.email === "string" ? claims.email : null,
      role: roleRow.role as StoreRole,
    },
  };
}

export async function getCurrentStoreUser(): Promise<CurrentStoreUser | null> {
  const result = await getCurrentStoreUserResult();
  return result.status === "authenticated" ? result.user : null;
}

export async function requireStoreRole(allowedRoles: StoreRole[]) {
  const result = await getCurrentStoreUserResult();
  if (result.status === "unauthenticated") redirect("/login?error=session_expired");
  if (result.status === "unavailable") redirect("/login?error=service_unavailable");
  if (result.status === "invalid-role") redirect("/dashboard");
  if (!allowedRoles.includes(result.user.role)) redirect("/dashboard");
  return result.user;
}