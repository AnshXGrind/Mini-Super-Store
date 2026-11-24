import type { Metadata } from "next";
import AuthForm from "@/components/auth/AuthForm";
import { getSafeAuthRedirect } from "@/lib/auth-redirect";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in | Mini Super Store",
  alternates: { canonical: "/login" },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; error?: string }>;
}) {
  const resolved = await searchParams;
  const { next } = resolved;
  const requestedNext = typeof next === "string" ? next : null;
  const authError = typeof resolved.error === "string" ? resolved.error : undefined;
  return <AuthForm mode="login" next={getSafeAuthRedirect(requestedNext)} authError={authError} />;
}
