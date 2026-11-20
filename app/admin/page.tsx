import AdminDashboard from "@/components/dashboard/AdminDashboard";
import { requireStoreRole } from "@/lib/auth";

export default async function AdminPage() {
  await requireStoreRole(["admin"]);
  return <AdminDashboard />;
}