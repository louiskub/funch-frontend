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
    <header
      className="sticky top-0 z-40 w-full border-b border-[#e0e6f1]/80 bg-white/85 backdrop-blur-md shadow-[0_1px_3px_0_rgba(37,49,76,0.02),0_4px_16px_-2px_rgba(37,49,76,0.04)] transition-all"
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
                ? "flex h-16 items-center pl-6 text-[32px] lg:w-[185px] lg:border-r lg:border-[#e0e6f1] lg:pl-8"
                : "text-[34px]",
            )}
          >
            funch<span className="text-primary">.</span>
          </Link>

          {/* Desktop Navigation */}
          {isCurrentAdminPath ? (
            <nav aria-label="Breadcrumb" className="hidden min-w-0 lg:block">
              <ol className="flex min-w-0 items-center gap-2 text-xs text-[#57657e]">
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
                    <li aria-hidden="true" className="text-[#57657e]">
                      /
                    </li>
                    <li
                      aria-current="page"
                      className="truncate font-semibold text-[#25314c]"
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
                        ? "bg-[#f0f5ff] text-primary font-semibold shadow-xs"
                        : "text-[#57657e] hover:bg-[#f0f5ff]/70 hover:text-primary",
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
              className="hidden min-h-11 items-center rounded-[8px] px-2 text-xs font-medium text-[#57657e] hover:text-primary focus-visible:outline-2 focus-visible:outline-primary md:inline-flex"
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
                className="inline-flex min-h-10 items-center gap-2 rounded-[10px] border border-[#e0e6f1] bg-white px-3.5 py-1.5 text-[13px] font-medium text-[#25314c] shadow-xs transition-all hover:border-primary/50 hover:bg-[#f8faff] hover:text-primary hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {isAdmin ? (
                  <ShieldCheckIcon size={15} className="text-primary" />
                ) : (
                  <UserIcon size={15} className="text-[#57657e]" />
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
                className="inline-flex size-10 items-center justify-center rounded-[10px] text-[#57657e] transition-colors hover:bg-[#f0f5ff] hover:text-primary focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
                title={t("signOut")}
              >
                <LogOutIcon size={16} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal("login")}
              className="hidden sm:inline-flex items-center gap-2 rounded-[30px] border border-primary bg-primary px-4.5 py-2 text-[13px] font-medium text-white shadow-xs transition-all hover:bg-[#1c358d] hover:shadow-sm hover:shadow-primary/25 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary cursor-pointer"
            >
              <UserIcon size={15} />
              <span>{t("signIn")}</span>
            </button>
          )}

          {/* Mobile hamburger */}
          <button
            ref={menuToggle}
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-[8px] border border-[#e0e6f1] text-[#57657e] hover:bg-[#f0f5ff] hover:text-primary focus-visible:outline-2 focus-visible:outline-primary md:hidden"
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

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div
          id="navbar-mobile-menu"
          className="border-t border-[#e0e6f1] bg-white px-6 py-4 md:hidden"
        >
          <nav
            className="flex flex-col space-y-3"
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
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-[#f0f5ff] text-primary font-semibold"
                      : "text-[#57657e] hover:bg-[#f0f5ff]/60 hover:text-primary",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="pt-2 border-t border-[#e0e6f1]">
              {isAuthenticated && user ? (
                <div className="flex items-center justify-between">
                  <Link
                    href="/account"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex min-h-11 min-w-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-[#25314c] hover:bg-[#f0f5ff] focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    <UserIcon size={16} className="shrink-0" />
                    <span className="truncate">{user.name}</span>
                  </Link>
                  <button
                    type="button"
                    disabled={isLoggingOut}
                    onClick={signOut}
                    className="min-h-11 shrink-0 rounded-[8px] px-3 py-2 text-xs font-semibold text-[#a22f2f] focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
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
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-primary hover:bg-[#f0f5ff] cursor-pointer"
                >
                  <UserIcon size={16} />
                  <span>{t("signInOrRegister")}</span>
                </button>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

function NavbarSkeleton() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#e0e6f1] bg-white/95">
      <div className="mx-auto flex h-[82px] max-w-[1280px] items-center justify-between px-6 sm:px-8">
        <span className="text-[34px] font-extrabold tracking-[-0.04em] text-primary">
          funch.
        </span>
      </div>
    </header>
  );
}

export function Navbar() {
  return (
    <Suspense fallback={<NavbarSkeleton />}>
      <NavbarContent />
    </Suspense>
  );
}
