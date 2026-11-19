import Link from "next/link";
import LogoutButton from "@/components/auth/LogoutButton";
import { requireStoreRole, type StoreRole } from "@/lib/auth";

export default async function RoleDashboard({
  role,
  title,
  description,
}: {
  role: StoreRole;
  title: string;
  description: string;
}) {
  const user = await requireStoreRole([role]);

  return (
    <main className="role-page">
      <section className="role-card">
        <Link className="auth-brand" href="/">MINI <span>SUPER</span> STORE</Link>
        <p className="auth-eyebrow">{role.toUpperCase()} WORKSPACE</p>
        <h1>{title}</h1>
        <p className="auth-description">{description}</p>
        <div className="role-user"><span>Signed in as</span><strong>{user.email ?? user.id}</strong><small>Role: {role}</small></div>
        <p className="role-coming">Your secure account and role are connected. The {role} tools will be added in their dedicated development phase.</p>
        <div className="role-actions"><Link className="role-link" href="/">View store website</Link><LogoutButton /></div>
      </section>
    </main>
  );
}