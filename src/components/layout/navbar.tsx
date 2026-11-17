"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, Suspense } from "react";
import { useTranslations } from "next-intl";
import {
  UserIcon,
  MenuIcon,
  XIcon,
  LogOutIcon,
  ShieldCheckIcon,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { useAuth, useAuthModalStore } from "@/features/auth";
import { LanguageSwitcher } from "./language-switcher";

function NavbarContent() {
  const router = useRouter();
  const pathname = usePathname() || "";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuToggle = useRef<HTMLButtonElement>(null);
  const { user, isAuthenticated, isAdmin, logout, isLoggingOut } = useAuth();
  const { openAuthModal } = useAuthModalStore();
  const t = useTranslations("nav");
  const tAdmin = useTranslations("admin");

  const isCurrentAdminPath =
    pathname === "/admin" || pathname.startsWith("/admin/");

  // Dynamic navigation links based on role
  const customerNavLinks = [
    { label: t("findCar"), href: "/" },
    ...(isAuthenticated ? [{ label: t("myBookings"), href: "/bookings" }] : []),
    ...(isAdmin ? [{ label: t("adminPortal"), href: "/admin/bookings" }] : []),
  ];

  const adminNavLinks = [
    { label: t("bookings"), href: "/admin/bookings" },
    { label: tAdmin("timeline"), href: "/admin/timeline" },
    { label: t("fleet"), href: "/admin/fleet" },
    { label: t("options"), href: "/admin/options" },
    { label: t("members"), href: "/admin/members" },
    { label: t("reports"), href: "/admin/reports" },
  ];

  const currentAdminPage = adminNavLinks.find(
    (link) => pathname === link.href || pathname.startsWith(`${link.href}/`),
  );
  const links = isCurrentAdminPath
    ? [{ label: t("backToStore"), href: "/" }]
    : customerNavLinks;
  const signOut = async () => {
    setMobileMenuOpen(false);
    try {
      await logout();
    } catch {
      // ignore
    }
    if (isCurrentAdminPath) {
      router.replace("/");
    }
  };

  return (
    <>
      <header
        className="fixed inset-x-0 top-0 z-40 w-full border-b border-border bg-white shadow-[0_1px_3px_0_color-mix(in_srgb,rgb(var(--shadow-color)) 2%, transparent),0_4px_16px_-2px_color-mix(in_srgb,rgb(var(--shadow-color)) 4%, transparent)] transition-all"
        onKeyDown={(event) => {
          if (event.key === "Escape" && mobileMenuOpen) {
            setMobileMenuOpen(false);
            menuToggle.current?.focus();
          }
        }}
      >
      <div
        className={cn(
          "mx-auto flex items-center justify-between",
          isCurrentAdminPath
            ? "h-16 gap-3 pr-4 sm:pr-8"
            : "h-[82px] max-w-[1280px] px-6 sm:px-8",
        )}
      >
        <div
          className={cn(
            "flex min-w-0 items-center",
            isCurrentAdminPath ? "gap-6" : "gap-10",
          )}
        >
          <Link
            href="/"
            className={cn(
              "shrink-0 font-extrabold tracking-[-0.04em] text-primary transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              isCurrentAdminPath
                ? "flex h-16 items-center pl-6 text-[32px] lg:w-[185px] lg:border-r lg:border-border lg:pl-8"
                : "text-[34px]",
            )}
          >
            Calrentar
          </Link>

          {/* Desktop Navigation */}
          {isCurrentAdminPath ? (
            <nav aria-label="Breadcrumb" className="hidden min-w-0 lg:block">
              <ol className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                <li>
                  <Link
                    href="/admin/bookings"
                    className="rounded hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    {tAdmin("workspace")}
                  </Link>
                </li>
                {currentAdminPage && (
                  <>
                    <li aria-hidden="true" className="text-muted-foreground">
                      /
                    </li>
                    <li
                      aria-current="page"
                      className="truncate font-semibold text-foreground"
                    >
                      {currentAdminPage.label}
                    </li>
                  </>
                )}
              </ol>
            </nav>
          ) : (
            <nav
              className="hidden items-center gap-2 md:flex"
              aria-label="Main navigation"
            >
              {links.map((link) => {
                const isActive =
                  link.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "rounded-full px-3.5 py-1.5 text-[14px] font-medium transition-all duration-150",
                      isActive
                        ? "bg-secondary text-primary font-semibold shadow-xs"
                        : "text-muted-foreground hover:bg-secondary/70 hover:text-primary",
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        {/* Right side actions */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {isCurrentAdminPath && (
            <Link
              href="/"
              className="hidden min-h-11 items-center rounded-[8px] px-2 text-xs font-medium text-muted-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-primary md:inline-flex"
            >
              {t("backToStore")}
            </Link>
          )}
          {/* Language Switcher */}
          <LanguageSwitcher />

          {isAuthenticated && user ? (
            <div className="hidden sm:flex items-center gap-3">
              <Link
                href="/account"
                className="inline-flex min-h-10 items-center gap-2 rounded-[10px] border border-border bg-white px-3.5 py-1.5 text-[13px] font-medium text-foreground shadow-xs transition-all hover:border-primary/50 hover:bg-surface-subtle hover:text-primary hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {isAdmin ? (
                  <ShieldCheckIcon size={15} className="text-primary" />
                ) : (
                  <UserIcon size={15} className="text-muted-foreground" />
                )}
                <span className="max-w-[140px] truncate">{user.name}</span>
                {isAdmin && !isCurrentAdminPath && (
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                    ADMIN
                  </span>
                )}
              </Link>
              <button
                type="button"
                onClick={signOut}
                disabled={isLoggingOut}
                aria-label={t("signOut")}
                className="inline-flex size-10 items-center justify-center rounded-[10px] text-muted-foreground transition-colors hover:bg-secondary hover:text-primary focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
                title={t("signOut")}
              >
                <LogOutIcon size={16} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal("login")}
              className="hidden sm:inline-flex items-center gap-2 rounded-[30px] border border-primary bg-primary px-4.5 py-2 text-[13px] font-medium text-white shadow-xs transition-all hover:bg-primary-hover hover:shadow-sm hover:shadow-primary/25 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary cursor-pointer"
            >
              <UserIcon size={15} />
              <span>{t("signIn")}</span>
            </button>
          )}

          {/* Mobile hamburger */}
          <button
            ref={menuToggle}
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-[8px] border border-border text-muted-foreground hover:bg-secondary hover:text-primary focus-visible:outline-2 focus-visible:outline-primary md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-controls="navbar-mobile-menu"
            aria-label={
              isCurrentAdminPath ? t("accountMenu") : t("navigationMenu")
            }
          >
            {mobileMenuOpen ? <XIcon size={20} /> : <MenuIcon size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu overlay & dropdown */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 z-40 bg-foreground/25 backdrop-blur-xs md:hidden animate-fade-in"
            style={{ top: isCurrentAdminPath ? "65px" : "83px" }}
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Floating menu panel */}
          <div
            id="navbar-mobile-menu"
            className="absolute top-full left-0 right-0 z-50 border-b border-border bg-white px-6 py-5 shadow-lg md:hidden animate-slide-down"
          >
            <nav
              className="flex flex-col space-y-2.5"
              aria-label={
                isCurrentAdminPath ? t("accountMenu") : "Main navigation"
              }
            >
              {links.map((link) => {
                const isActive =
                  link.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "rounded-[10px] px-3.5 py-2.5 text-sm font-semibold transition-all duration-150",
                      isActive
                        ? "bg-secondary text-primary shadow-xs"
                        : "text-muted-foreground hover:bg-secondary/70 hover:text-primary",
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
              <div className="pt-3 border-t border-border">
                {isAuthenticated && user ? (
                  <div className="flex items-center justify-between">
                    <Link
                      href="/account"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex min-h-11 min-w-0 items-center gap-2.5 rounded-[10px] px-3 py-2 text-sm font-semibold text-foreground hover:bg-secondary focus-visible:outline-2 focus-visible:outline-primary transition-colors"
                    >
                      <UserIcon size={16} className="shrink-0 text-primary" />
                      <span className="truncate">{user.name}</span>
                    </Link>
                    <button
                      type="button"
                      disabled={isLoggingOut}
                      onClick={signOut}
                      className="min-h-10 shrink-0 rounded-[8px] px-3.5 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/10 focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      {t("signOut")}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      openAuthModal("login");
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-primary py-2.5 text-center text-sm font-bold text-white shadow-xs hover:bg-primary-hover transition-all cursor-pointer active:scale-[0.99]"
                  >
                    <UserIcon size={16} />
                    <span>{t("signInOrRegister")}</span>
                  </button>
                )}
              </div>
            </nav>
          </div>
        </>
      )}
      </header>
      <div
        aria-hidden="true"
        className={isCurrentAdminPath ? "h-[65px]" : "h-[83px]"}
      />
    </>
  );
}

function NavbarSkeleton() {
  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 w-full border-b border-border bg-white">
        <div className="mx-auto flex h-[82px] max-w-[1280px] items-center justify-between px-6 sm:px-8">
          <span className="text-[34px] font-extrabold tracking-[-0.04em] text-primary">
            Calrentar
          </span>
        </div>
      </header>
      <div aria-hidden="true" className="h-[83px]" />
    </>
  );
}

export function Navbar() {
  return (
    <Suspense fallback={<NavbarSkeleton />}>
      <NavbarContent />
    </Suspense>
  );
}
