import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentStoreUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Dashboard | Mini Super Store",
  robots: { index: false, follow: false },
};

export default async function DashboardRedirectPage() {
  const user = await getCurrentStoreUser();

  if (!user) {
    // No session — the login page will add ?next= if needed; return null so
    // the middleware can send the user to /login if required.
    return null;
  }

  // Route based on role — this prevents the blank-page issue caused by
  // the previous "return null" that ignored the user's role entirely.
  if (user.role === "admin") {
    redirect("/admin");
  }
  if (user.role === "staff") {
    redirect("/staff");
  }
  if (user.role === "customer") {
    redirect("/account");
  }

  // No valid role in the database — show a useful error instead of
  // redirecting endlessly to /login. The middleware still protects the
  // route, but we render a clear message so the user (or operator) knows
  // their account hasn't been assigned a role yet.
  return (
    <div className="account-error" role="alert">
      <p>
        This account does not have a valid role assigned. Please contact the
        store administrator or sign up as a new customer.
      </p>
    </div>
  );
}