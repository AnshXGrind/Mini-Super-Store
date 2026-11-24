import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const pathname = request.nextUrl.pathname;
  const isProtectedRoute =
    pathname === "/dashboard" ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/staff");

  if (!url || !key) {
    if (isProtectedRoute) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Validates claims and refreshes expired cookie-backed sessions. A transient
  // Supabase/network failure is treated as unauthenticated instead of crashing
  // every route through the proxy.
  let userId: string | null = null;
  let claimsFailed = false;
  try {
    const { data, error } = await supabase.auth.getClaims();
    const subject = data?.claims?.sub;
    if (error) claimsFailed = true;
    if (typeof subject === "string") userId = subject;
  } catch {
    claimsFailed = true;
  }

  if (isProtectedRoute && (claimsFailed || !userId)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (typeof userId === "string" && (pathname.startsWith("/admin") || pathname.startsWith("/staff") || pathname.startsWith("/account"))) {
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    const role = roleRow?.role;
    if (pathname.startsWith("/admin") && role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    if (pathname.startsWith("/staff") && role !== "staff") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    if (pathname.startsWith("/account") && role !== "customer") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}