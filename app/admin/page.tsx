import type { Metadata } from "next";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import { requireStoreRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin | Mini Super Store",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  await requireStoreRole(["admin"]);
  return <AdminDashboard />;
}