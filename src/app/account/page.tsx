"use client";

import Link from "next/link";
import { FormEvent, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { UserIcon, AlertCircleIcon, ChevronRightIcon } from "@/components/ui/icons";

type Mode = "login" | "register";

function AccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect");

  const {
    user,
    isLoading,
    login,
    isLoggingIn,
    register,
    isRegistering,
    updateProfile,
    isUpdatingProfile,
    logout,
    isLoggingOut,
    refetchUser,
  } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [errorMessage, setErrorMessage] = useState("");

  const pending = isLoggingIn || isRegistering || isUpdatingProfile || isLoggingOut;

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");

    try {
      if (mode === "login") {
        const loggedInUser = await login({ email, password });
        if (redirectUrl) {
          router.push(redirectUrl);
        } else if (loggedInUser.role === "ADMIN") {
          router.push("/admin/bookings");
        }
      } else {
        const name = String(form.get("name") || "");
        const phone = String(form.get("phone") || "");
        await register({ name, email, password, phone });
        if (redirectUrl) {
          router.push(redirectUrl);
        }
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Authentication failed");
    }
  }

  async function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    const form = new FormData(event.currentTarget);
    try {
      await updateProfile({
        name: String(form.get("name") || ""),
        email: String(form.get("email") || ""),
        phone: String(form.get("phone") || ""),
      });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to update profile");
    }
  }

  return (
    <main className="mx-auto w-full max-w-[620px] px-4 py-8 sm:px-6 sm:py-16">
      <div className="mb-6">
        <Link
          href="/"
          className="text-xs font-semibold text-primary transition-colors hover:text-[#1c358d]"
        >
          ← Back to home
        </Link>
      </div>

      <Card className="rounded-[18px] border-[#e0e6f1] bg-white shadow-sm overflow-hidden">
        <CardHeader className="border-b border-[#e0e6f1] p-6 sm:p-8 bg-[#f0f5ff]/40">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-primary text-white">
              <UserIcon size={20} />
            </div>
            <div>
              <CardTitle className="text-2xl">
                {user ? "Your profile & account" : "Sign in to FUNCH"}
              </CardTitle>
              <CardDescription>
                {user
                  ? "Manage your personal information and view your booking role."
                  : "Access your bookings, saved rentals, and fast checkout."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 sm:p-8 space-y-6">
          {errorMessage && (
            <div
              role="alert"
              className="rounded-[10px] p-4 text-xs font-medium flex items-center justify-between bg-[#fce8e8] text-[#a22f2f] border border-[#fecaca]"
            >
              <div className="flex items-center gap-2">
                <AlertCircleIcon size={16} />
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex min-h-[160px] flex-col items-center justify-center gap-3">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-xs text-[#57657e]">Checking your account…</p>
            </div>
          ) : user ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between rounded-[12px] bg-[#f0f5ff] p-4 border border-[#d7e2f5]">
                <div>
                  <span className="text-[11px] font-semibold text-[#57657e] block">
                    Account Role
                  </span>
                  <span className="text-sm font-bold text-primary">
                    {user.role === "ADMIN" ? "Administrator" : "Verified Customer"}
                  </span>
                </div>
                {user.role === "ADMIN" && (
                  <Button asChild size="sm" variant="default" className="h-8 text-xs font-semibold">
                    <Link href="/admin/bookings">
                      <span>Open admin portal</span>
                      <ChevronRightIcon size={13} />
                    </Link>
                  </Button>
                )}
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#25314c]">Full name</label>
                  <Input
                    name="name"
                    required
                    maxLength={120}
                    defaultValue={user.name}
                    className="h-11 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#25314c]">Email address</label>
                  <Input
                    name="email"
                    type="email"
                    required
                    maxLength={254}
                    defaultValue={user.email}
                    className="h-11 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#25314c]">Phone number</label>
                  <Input
                    name="phone"
                    required
                    minLength={3}
                    maxLength={40}
                    defaultValue={user.phone}
                    className="h-11 text-sm"
                  />
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <Button
                    type="submit"
                    disabled={pending}
                    className="h-11 font-semibold"
                  >
                    {isUpdatingProfile ? "Saving…" : "Save changes"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending}
                    onClick={() => logout()}
                    className="h-11 text-xs font-semibold"
                  >
                    {isLoggingOut ? "Signing out…" : "Sign out"}
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Mode Switcher */}
              <div className="flex border-b border-[#e0e6f1]">
                <button
                  type="button"
                  className={`pb-3 text-sm font-bold transition-all relative ${
                    mode === "login"
                      ? "text-primary border-b-2 border-primary"
                      : "text-[#57657e] hover:text-[#25314c]"
                  }`}
                  onClick={() => {
                    setMode("login");
                    setErrorMessage("");
                  }}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  className={`ml-8 pb-3 text-sm font-bold transition-all relative ${
                    mode === "register"
                      ? "text-primary border-b-2 border-primary"
                      : "text-[#57657e] hover:text-[#25314c]"
                  }`}
                  onClick={() => {
                    setMode("register");
                    setErrorMessage("");
                  }}
                >
                  Create new account
                </button>
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                {mode === "register" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#25314c]">Full name</label>
                    <Input
                      name="name"
                      required
                      maxLength={120}
                      placeholder="Jane Doe"
                      className="h-11 text-sm"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#25314c]">Email address</label>
                  <Input
                    name="email"
                    type="email"
                    required
                    maxLength={254}
                    placeholder="jane@example.com"
                    className="h-11 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#25314c]">Password</label>
                  <Input
                    name="password"
                    type="password"
                    required
                    minLength={mode === "register" ? 6 : 1}
                    maxLength={128}
                    placeholder="••••••••••••"
                    className="h-11 text-sm"
                  />
                  {mode === "register" && (
                    <span className="text-[11px] text-[#57657e] block">
                      Must be at least 6 characters.
                    </span>
                  )}
                </div>

                {mode === "register" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#25314c]">Phone number</label>
                    <Input
                      name="phone"
                      required
                      minLength={3}
                      maxLength={40}
                      placeholder="+66 81 234 5678"
                      className="h-11 text-sm"
                    />
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={pending}
                  className="h-12 w-full text-sm font-bold mt-2"
                >
                  {pending
                    ? "Authenticating…"
                    : mode === "login"
                      ? "Sign in to account"
                      : "Create account"}
                </Button>
              </form>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-[#57657e]">Loading account…</div>}>
      <AccountContent />
    </Suspense>
  );
}
