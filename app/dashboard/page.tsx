import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | Mini Super Store",
  robots: { index: false, follow: false },
};

export default function DashboardRedirectPage() {
  // Render nothing; routing is handled by the middleware role checks
  // and the login page's `next` parameter. This prevents the automatic
  // redirect loop that occurred when DashboardRedirectPage always redirected
  // based on role (especially when the user has no role row in the DB).
  return null;
}