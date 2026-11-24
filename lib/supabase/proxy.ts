import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isTemporaryAuthFailure } from "@/lib/auth-error";

function redirectWithCookies(url: URL, response?: NextResponse) {
  const redirectResponse = NextResponse.redirect(url);
  response?.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
  return redirectResponse;
}

function loginRedirect(request: NextRequest, error: string, response?: NextResponse) {
  const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const url = new URL("/login", request.url);
  url.searchParams.set("error", error);
  url.searchParams.set("next", next);
  return redirectWithCookies(url, response);
}

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
      return loginRedirect(request, "service_unavailable");
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

  // Validate claims and keep transient service failures distinct from invalid sessions.
  let userId: string | null = null;
  let claimsError: unknown = null;
  try {
    const { data, error } = await supabase.auth.getClaims();
    const subject = data?.claims?.sub;
    if (error) {
      claimsError = error;
    } else if (typeof subject === "string") {
      userId = subject;
    }
  } catch (error) {
    claimsError = error;
  }

  if (isProtectedRoute && claimsError) {
    return loginRedirect(
      request,
      isTemporaryAuthFailure(claimsError) ? "service_unavailable" : "session_expired",
      response,
    );
  }
  if (isProtectedRoute && !userId) {
    return loginRedirect(request, "session_expired", response);
  }

  if (typeof userId === "string" && (pathname.startsWith("/admin") || pathname.startsWith("/staff") || pathname.startsWith("/account"))) {
    let roleRow;
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) return loginRedirect(request, "service_unavailable", response);
      roleRow = data;
    } catch {
      return loginRedirect(request, "service_unavailable", response);
    }

    const role = roleRow?.role;
    if (!["customer", "staff", "admin"].includes(role)) {
      return redirectWithCookies(new URL("/dashboard", request.url), response);
    }
    if (pathname.startsWith("/admin") && role !== "admin") {
      return redirectWithCookies(new URL("/dashboard", request.url), response);
    }
    if (pathname.startsWith("/staff") && role !== "staff") {
      return redirectWithCookies(new URL("/dashboard", request.url), response);
    }
    if (pathname.startsWith("/account") && role !== "customer") {
      return redirectWithCookies(new URL("/dashboard", request.url), response);
    }
  }

  return response;
}