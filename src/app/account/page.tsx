"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth, useAuthModalStore } from "@/features/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { UserIcon, AlertCircleIcon, ChevronRightIcon } from "@/components/ui/icons";

function AccountContent() {
  const tAccount = useTranslations("account");
  const tCommon = useTranslations("common");
  const tAuth = useTranslations("auth");
  const tNav = useTranslations("nav");
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect");

  const {
    user,
    isLoading,
    updateProfile,
    isUpdatingProfile,
    logout,
    isLoggingOut,
  } = useAuth();

  const { openAuthModal } = useAuthModalStore();
  const [errorMessage, setErrorMessage] = useState("");

  const pending = isUpdatingProfile || isLoggingOut;

  // If user lands on account page while not logged in, prompt modal
  useEffect(() => {
    if (!isLoading && !user) {
      openAuthModal("login", {
        redirectUrl: redirectUrl || undefined,
      });
    }
  }, [isLoading, user, openAuthModal, redirectUrl]);

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
          className="text-xs font-semibold text-primary transition-colors hover:text-primary-hover"
        >
          {tCommon("backToHome")}
        </Link>
      </div>

      <Card className="rounded-[18px] border-border bg-white shadow-sm overflow-hidden">
        <CardHeader className="border-b border-border p-6 sm:p-8 bg-secondary/40">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-primary text-white">
              <UserIcon size={20} />
            </div>
            <div>
              <CardTitle className="text-2xl">
                {user ? tAccount("title") : tAuth("signInTitle")}
              </CardTitle>
              <CardDescription>
                {user
                  ? tAccount("subtitle")
                  : tAuth("signInSubtitle")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 sm:p-8 space-y-6">
          {errorMessage && (
            <div
              role="alert"
              className="rounded-[10px] p-4 text-xs font-medium flex items-center justify-between bg-status-rejected-bg text-status-rejected-text border border-status-rejected-border"
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
              <p className="text-xs text-muted-foreground">Checking your account…</p>
            </div>
          ) : user ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between rounded-[12px] bg-secondary p-4 border border-border-subtle">
                <div>
                  <span className="text-[11px] font-semibold text-muted-foreground block">
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
                  <label className="text-xs font-bold text-foreground">{tAuth("name")}</label>
                  <Input
                    name="name"
                    required
                    maxLength={120}
                    defaultValue={user.name}
                    className="h-11 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">{tAuth("email")}</label>
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
                  <label className="text-xs font-bold text-foreground">{tAuth("phone")}</label>
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
                    {isUpdatingProfile ? tAccount("saving") : tAccount("saveChanges")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending}
                    onClick={() => logout()}
                    className="h-11 text-xs font-semibold"
                  >
                    {isLoggingOut ? tAuth("signingInButton") : tNav("signOut")}
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <div className="py-6 text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                {tAuth("signInSubtitle")}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Button
                  type="button"
                  onClick={() => openAuthModal("login", { redirectUrl: redirectUrl || undefined })}
                  className="h-11 w-full sm:w-auto px-6 font-bold"
                >
                  {tAuth("signInButton")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => openAuthModal("register", { redirectUrl: redirectUrl || undefined })}
                  className="h-11 w-full sm:w-auto px-6 font-semibold"
                >
                  {tAuth("registerButton")}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Loading account…</div>}>
      <AccountContent />
    </Suspense>
  );
}
