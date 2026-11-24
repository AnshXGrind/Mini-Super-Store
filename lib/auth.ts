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
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      ("digest" in error && error.digest === "DYNAMIC_SERVER_USAGE" ||
       "message" in error && typeof error.message === "string" && error.message.includes("Dynamic server usage"))
    ) {
      throw error;
    }
    console.error("[auth] Failed to initialize Supabase server client:", error);
    return { status: "unavailable" };
  }

  let claims: Record<string, unknown> | null = null;
  try {
    const result = await supabase.auth.getClaims();
    if (result.error) {
      console.error("[auth] supabase.auth.getClaims returned error:", result.error);
      return isTemporaryAuthFailure(result.error)
        ? { status: "unavailable" }
        : { status: "unauthenticated" };
    }
    claims = (result.data?.claims as Record<string, unknown>) ?? null;
  } catch (error) {
    console.error("[auth] supabase.auth.getClaims threw error:", error);
    return isTemporaryAuthFailure(error)
      ? { status: "unavailable" }
      : { status: "unauthenticated" };
  }

  let userId: string | null = typeof claims?.sub === "string" ? claims.sub : null;
  let userEmail: string | null = typeof claims?.email === "string" ? claims.email : null;

  if (!userId) {
    try {
      const userRes = await supabase.auth.getUser();
      if (userRes.data?.user) {
        userId = userRes.data.user.id;
        userEmail = userRes.data.user.email ?? null;
      } else if (userRes.error) {
        console.warn("[auth] supabase.auth.getUser fallback returned error:", userRes.error.message);
      }
    } catch (error) {
      console.warn("[auth] supabase.auth.getUser fallback threw error:", error);
    }
  }

  if (!userId) {
    return { status: "unauthenticated" };
  }

  let roleRow;
  try {
    const result = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    if (result.error) {
      console.error(`[auth] Query to public.user_roles failed for user ${userId}:`, result.error);
      return { status: "unavailable" };
    }
    roleRow = result.data;
  } catch (error) {
    console.error(`[auth] Query to public.user_roles threw error for user ${userId}:`, error);
    return { status: "unavailable" };
  }

  if (!roleRow || !["customer", "staff", "admin"].includes(roleRow.role)) {
    console.warn(`[auth] User ${userId} has missing or invalid role in public.user_roles:`, roleRow);
    return { status: "invalid-role" };
  }

  return {
    status: "authenticated",
    user: {
      id: userId,
      email: userEmail,
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