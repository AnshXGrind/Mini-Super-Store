"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AuthFormProps = { mode: "login" | "register"; next?: string };

export default function AuthForm({ mode, next = "/dashboard" }: AuthFormProps) {
  const isRegister = mode === "register";
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setBusy(true);

    try {
      const supabase = createClient();
      if (isRegister) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: fullName.trim(), phone: phone.trim(), preferred_language: "en" },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });
        if (error) throw error;
        if (data.session) {
          router.replace(next);
          router.refresh();
        } else {
          setSuccessMessage("Account created. Check your email for the confirmation link, then sign in.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        router.replace(next);
        router.refresh();
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <Link className="auth-brand" href="/">MINI <span>SUPER</span> STORE</Link>
        <p className="auth-eyebrow">{isRegister ? "CUSTOMER ACCOUNT" : "WELCOME BACK"}</p>
        <h1 id="auth-title">{isRegister ? "Create your account" : "Sign in to your account"}</h1>
        <p className="auth-description">
          {isRegister
            ? "Create a customer account to prepare for order history, saved items and reminders."
            : "Sign in to continue to your Mini Super Store account or staff workspace."}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {isRegister && (
            <>
              <label>Full name<input autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} required maxLength={100} /></label>
              <label>Phone number <span className="auth-optional">(optional)</span><input type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={20} /></label>
            </>
          )}
          <label>Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} /></label>
          <label>Password<input type="password" autoComplete={isRegister ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} maxLength={128} /></label>
          {isRegister && <p className="auth-hint">Use at least 8 characters. New public registrations always receive the customer role.</p>}
          {errorMessage && <p className="auth-message auth-error" role="alert">{errorMessage}</p>}
          {successMessage && <p className="auth-message auth-success" role="status">{successMessage}</p>}
          <button className="auth-submit" type="submit" disabled={busy}>{busy ? "Please wait…" : isRegister ? "Create account" : "Sign in"}</button>
        </form>

        <p className="auth-switch">
          {isRegister ? "Already have an account? " : "New to Mini Super Store? "}
          <Link href={isRegister ? "/login" : "/register"}>{isRegister ? "Sign in" : "Create an account"}</Link>
        </p>
        <Link className="auth-back" href="/">← Back to store</Link>
      </section>
    </main>
  );
}