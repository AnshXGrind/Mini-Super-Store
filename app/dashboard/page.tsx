import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentStoreUserResult } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard | Mini Super Store",
  robots: { index: false, follow: false },
};

export default async function DashboardRedirectPage() {
  const result = await getCurrentStoreUserResult();

  if (result.status === "unauthenticated") {
    redirect("/login?error=session_expired&next=%2Fdashboard");
  }
  if (result.status === "unavailable") {
    return (
      <div className="account-error" role="alert">
        <p>We could not verify your account because the authentication service is temporarily unavailable.</p>
        <Link href="/dashboard">Try again</Link>
      </div>
    );
  }
  if (result.status === "invalid-role") {
    return (
      <div className="account-error" role="alert">
        <p>
          This account does not have a valid role assigned. Please contact the
          store administrator to restore access.
        </p>
      </div>
    );
  }

  const { user } = result;

  if (user.role === "admin") {
    redirect("/admin");
  }
  if (user.role === "staff") {
    redirect("/staff");
  }
  if (user.role === "customer") {
    redirect("/account");
  }

  return (
    <div className="account-error" role="alert">
      <p>This account role is not supported. Please contact the store administrator.</p>
    </div>
  );
}