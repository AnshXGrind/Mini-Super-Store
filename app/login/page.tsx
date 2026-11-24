import type { Metadata } from "next";
import AuthForm from "@/components/auth/AuthForm";
import { getSafeAuthRedirect } from "@/lib/auth-redirect";

export const metadata: Metadata = {
  title: "Sign in | Mini Super Store",
  alternates: { canonical: "/login" },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;
  const requestedNext = typeof next === "string" ? next : null;
  return <AuthForm mode="login" next={getSafeAuthRedirect(requestedNext)} />;
}
