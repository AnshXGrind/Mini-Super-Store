import StaffDashboard from "@/components/dashboard/StaffDashboard";
import { requireStoreRole } from "@/lib/auth";

export default async function StaffPage() {
  await requireStoreRole(["staff"]);
  return <StaffDashboard />;
}