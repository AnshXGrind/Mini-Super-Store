import RoleDashboard from "@/components/auth/RoleDashboard";
export default function AccountPage() {
  return <RoleDashboard role="customer" title="Your account" description="Your customer account is connected. Order history, favourites and reminders will be added in the customer portal phase." />;
}