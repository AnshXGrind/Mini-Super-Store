import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSafeAuthRedirect } from "@/lib/auth-redirect";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const requestedNext = requestUrl.searchParams.get("next") ?? "/dashboard";
  const safeNext = getSafeAuthRedirect(requestedNext);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeNext, requestUrl.origin));
  }

  return NextResponse.redirect(new URL("/login?error=auth_callback_failed", requestUrl.origin));
}