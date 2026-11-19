"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleLogout() {
    setBusy(true);
    const { error } = await createClient().auth.signOut();
    setBusy(false);
    if (error) return;
    router.replace("/login");
    router.refresh();
  }

  return <button className="auth-logout" type="button" onClick={handleLogout} disabled={busy}>{busy ? "Signing out…" : "Sign out"}</button>;
}