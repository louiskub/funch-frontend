"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { authenticate, currentUser, logout, updateProfile, User } from "../auth";
import { ApiError } from "../catalog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { UserIcon, AlertCircleIcon, ChevronRightIcon } from "@/components/ui/icons";

type Mode = "login" | "register";

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<Mode>("login");
  const [status, setStatus] = useState("Checking your account…");
  const [pending, setPending] = useState(false);
  const [checkingAccount, setCheckingAccount] = useState(true);
  const [accountCheckFailed, setAccountCheckFailed] = useState(false);

  const checkAccount = useCallback(async () => {
    setCheckingAccount(true);
    setAccountCheckFailed(false);
    setStatus("Checking your account…");
    try {
      setUser(await currentUser());
      setStatus("");
    } catch (error) {
      setUser(null);
      if (error instanceof ApiError && error.status === 401) {
        setStatus("");
        return;
      }
      setAccountCheckFailed(true);
      setStatus(
        error instanceof TypeError
          ? "Could not reach the account service. Please retry."
          : error instanceof Error
            ? error.message
            : "Could not check your account. Please retry.",
      );
    } finally {
      setCheckingAccount(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(checkAccount);
  }, [checkAccount]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (checkingAccount || pending) return;
    setPending(true);
    setStatus("");
    setAccountCheckFailed(false);
    const form = new FormData(event.currentTarget);
    const data = Object.fromEntries(
      [...form.entries()].map(([key, value]) => [key, String(value)]),
    );
    try {
      const nextUser = await authenticate(mode, data);
      setUser(nextUser);
      setStatus("Your account is ready.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not sign in.");
    } finally {
      setPending(false);
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setStatus("");
    const form = new FormData(event.currentTarget);
    try {
      const nextUser = await updateProfile({
        name: String(form.get("name")),
        email: String(form.get("email")),
        phone: String(form.get("phone")),
      });
      setUser(nextUser);
      setStatus("Profile saved successfully.");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Could not save your profile.",
      );
    } finally {
      setPending(false);
    }
  }

  async function signOut() {
    setPending(true);
    try {
      await logout();
      setUser(null);
      setStatus("You are signed out.");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Could not sign out.",
      );
    } finally {
      setPending(false);
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
          {status && (
            <div
              role={accountCheckFailed ? "alert" : "status"}
              className={`rounded-[10px] p-4 text-xs font-medium flex items-center justify-between ${
                accountCheckFailed
                  ? "bg-[#fce8e8] text-[#a22f2f] border border-[#fecaca]"
                  : "bg-[#f0f5ff] text-[#25314c] border border-[#d7e2f5]"
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertCircleIcon size={16} />
                <span>{status}</span>
              </div>
              {accountCheckFailed && (
                <button
                  type="button"
                  disabled={checkingAccount || pending}
                  onClick={() => void checkAccount()}
                  className="font-bold underline ml-2"
                >
                  Retry
                </button>
              )}
            </div>
          )}

          {user ? (
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

              <form onSubmit={saveProfile} className="space-y-4">
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
                    {pending ? "Saving…" : "Save changes"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending}
                    onClick={signOut}
                    className="h-11 text-xs font-semibold"
                  >
                    Sign out
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
                    setStatus("");
                    setAccountCheckFailed(false);
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
                    setStatus("");
                    setAccountCheckFailed(false);
                  }}
                >
                  Create new account
                </button>
              </div>

              <form onSubmit={signIn} className="space-y-4">
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
                    minLength={mode === "register" ? 12 : 1}
                    maxLength={128}
                    placeholder="••••••••••••"
                    className="h-11 text-sm"
                  />
                  {mode === "register" && (
                    <span className="text-[11px] text-[#57657e] block">
                      Must be at least 12 characters.
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
                  disabled={pending || checkingAccount}
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
