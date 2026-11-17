"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth, useAuthModalStore } from "@/features/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertCircleIcon,
  CalendarIcon,
  ChevronRightIcon,
  LogOutIcon,
  ShieldCheckIcon,
  UserIcon,
} from "@/components/ui/icons";

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
      setErrorMessage(err instanceof Error ? err.message : tAccount("saveError"));
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1080px] px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="mb-6">
        <Link
          href="/"
          className="rounded text-xs font-semibold text-primary transition-colors hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
        >
          {tCommon("backToHome")}
        </Link>
      </div>

      <header className="mb-8 max-w-2xl">
        <h1 className="text-[35px] font-extrabold leading-tight tracking-tight text-foreground sm:text-[43px]">
          {user ? tAccount("title") : tAuth("signInTitle")}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {user ? tAccount("subtitle") : tAuth("signInSubtitle")}
        </p>
      </header>

      {errorMessage && (
        <div
          role="alert"
          className="mb-6 flex items-center gap-2 rounded-[12px] border border-status-rejected-border bg-status-rejected-bg p-4 text-sm font-medium text-status-rejected-text"
        >
          <AlertCircleIcon size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {isLoading ? (
        <div aria-busy="true" aria-label={tCommon("loading")} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-6">
            <div className="h-32 animate-pulse rounded-[24px] bg-secondary" />
            <div className="space-y-5 rounded-[24px] border border-border p-6 sm:p-8">
              <div className="h-6 w-40 animate-pulse rounded bg-secondary" />
              <div className="h-11 animate-pulse rounded-[10px] bg-secondary" />
              <div className="h-11 animate-pulse rounded-[10px] bg-secondary" />
              <div className="h-11 animate-pulse rounded-[10px] bg-secondary" />
            </div>
          </div>
          <div className="h-56 animate-pulse rounded-[24px] bg-secondary" />
        </div>
      ) : user ? (
        <>
          <section
            aria-label={tAccount("identity")}
            className="mb-6 flex flex-col gap-4 rounded-[24px] bg-secondary p-5 sm:flex-row sm:items-center sm:p-7"
          >
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground sm:h-[72px] sm:w-[72px]">
              <UserIcon size={30} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-muted-foreground">{tAccount("identity")}</p>
              <h2 className="mt-1 break-words text-[27px] font-extrabold leading-tight tracking-tight text-foreground">
                {user.name}
              </h2>
              <p className="mt-1 break-all text-sm text-muted-foreground">{user.email}</p>
            </div>
            <div className="inline-flex min-h-9 w-fit items-center gap-2 rounded-full border border-border bg-card px-3 text-xs font-bold text-primary">
              {user.role === "ADMIN" ? <ShieldCheckIcon size={15} /> : <UserIcon size={15} />}
              <span>
                {user.role === "ADMIN" ? tAccount("adminRole") : tAccount("customerRole")}
              </span>
            </div>
          </section>

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <section
              aria-labelledby="profile-title"
              className="rounded-[24px] border border-border bg-card p-5 sm:p-7"
            >
              <div className="mb-6 border-b border-border pb-5">
                <h2 id="profile-title" className="text-xl font-bold tracking-tight text-foreground">
                  {tAccount("profile")}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {tAccount("profileDescription")}
                </p>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="account-name" className="text-sm font-semibold text-foreground">
                      {tAuth("name")}
                    </label>
                    <Input
                      id="account-name"
                      name="name"
                      autoComplete="name"
                      required
                      maxLength={120}
                      defaultValue={user.name}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="account-phone" className="text-sm font-semibold text-foreground">
                      {tAuth("phone")}
                    </label>
                    <Input
                      id="account-phone"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      required
                      minLength={3}
                      maxLength={40}
                      defaultValue={user.phone}
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <label htmlFor="account-email" className="text-sm font-semibold text-foreground">
                      {tAuth("email")}
                    </label>
                    <Input
                      id="account-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      maxLength={254}
                      defaultValue={user.email}
                    />
                  </div>
                </div>

                <div className="flex justify-end border-t border-border pt-5">
                  <Button type="submit" disabled={pending} className="min-h-11 w-full font-semibold sm:w-auto">
                    {isUpdatingProfile ? tAccount("saving") : tAccount("saveChanges")}
                  </Button>
                </div>
              </form>
            </section>

            <aside className="rounded-[24px] bg-secondary p-5 sm:p-6">
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                {tAccount("shortcuts")}
              </h2>
              <nav aria-label={tAccount("shortcuts")} className="mt-3">
                <Link
                  href="/bookings"
                  className="group flex min-h-[60px] items-center gap-3 rounded-[12px] px-3 py-3 transition-colors hover:bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-card text-primary">
                    <CalendarIcon size={19} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-foreground">{tNav("myBookings")}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                      {tAccount("bookingsDescription")}
                    </span>
                  </span>
                  <ChevronRightIcon size={17} className="text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>

                {user.role === "ADMIN" && (
                  <Link
                    href="/admin/bookings"
                    className="group mt-1 flex min-h-[60px] items-center gap-3 rounded-[12px] px-3 py-3 transition-colors hover:bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-card text-primary">
                      <ShieldCheckIcon size={19} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-foreground">{tNav("adminPortal")}</span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                        {tAccount("adminPortalDescription")}
                      </span>
                    </span>
                    <ChevronRightIcon size={17} className="text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                )}
              </nav>

              <div className="mt-4 border-t border-border-subtle pt-4">
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => void logout().catch(() => undefined)}
                  className="min-h-11 w-full justify-start bg-card text-sm font-semibold"
                >
                  <LogOutIcon size={17} />
                  {isLoggingOut ? tAccount("signingOut") : tNav("signOut")}
                </Button>
              </div>
            </aside>
          </div>
        </>
      ) : (
        <section className="max-w-xl rounded-[24px] border border-border bg-card p-6 sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              onClick={() => openAuthModal("login", { redirectUrl: redirectUrl || undefined })}
              className="min-h-11 w-full px-6 font-bold sm:w-auto"
            >
              {tAuth("signInButton")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => openAuthModal("register", { redirectUrl: redirectUrl || undefined })}
              className="min-h-11 w-full px-6 font-semibold sm:w-auto"
            >
              {tAuth("registerButton")}
            </Button>
          </div>
        </section>
      )}
    </main>
  );
}

export default function AccountPage() {
  const tCommon = useTranslations("common");

  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">{tCommon("loading")}</div>}>
      <AccountContent />
    </Suspense>
  );
}
