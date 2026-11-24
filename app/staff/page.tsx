import type { Metadata } from "next";
import StaffDashboard from "@/components/dashboard/StaffDashboard";
import { requireStoreRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Staff | Mini Super Store",
  robots: { index: false, follow: false },
};

export default async function StaffPage() {
  await requireStoreRole(["staff"]);
  return <StaffDashboard />;
}