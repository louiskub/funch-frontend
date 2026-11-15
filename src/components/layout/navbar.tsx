"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, Suspense } from "react";
import { useTranslations } from "next-intl";
import { UserIcon, MenuIcon, XIcon, LogOutIcon, ShieldCheckIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { LanguageSwitcher } from "./language-switcher";

function NavbarContent() {
  const pathname = usePathname() || "";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, isAdmin, logout, isLoggingOut } = useAuth();
  const t = useTranslations("nav");

  const isCurrentAdminPath = pathname.startsWith("/admin");

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
    { label: t("backToStore"), href: "/" },
  ];

  const links = isCurrentAdminPath ? adminNavLinks : customerNavLinks;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#e0e6f1] bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-[82px] max-w-[1280px] items-center justify-between px-6 sm:px-8">
        <div className="flex items-center gap-10">
          <Link
            href="/"
            className="text-[34px] font-extrabold tracking-[-0.04em] text-primary transition-opacity hover:opacity-90"
          >
            funch<span className="text-primary">.</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-7 md:flex" aria-label="Main navigation">
            {links.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "text-[14px] font-medium transition-colors hover:text-primary",
                    isActive
                      ? "text-primary font-semibold"
                      : "text-[#57657e]"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          {/* Language Switcher */}
          <LanguageSwitcher />

          {isAuthenticated && user ? (
            <div className="hidden sm:flex items-center gap-3">
              <Link
                href="/account"
                className="inline-flex items-center gap-2 rounded-[30px] border border-[#e0e6f1] bg-white px-3.5 py-1.5 text-[13px] font-medium text-[#25314c] transition-colors hover:border-primary hover:text-primary"
              >
                {isAdmin ? (
                  <ShieldCheckIcon size={15} className="text-primary" />
                ) : (
                  <UserIcon size={15} className="text-[#57657e]" />
                )}
                <span className="max-w-[140px] truncate">{user.name}</span>
                {isAdmin && (
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                    ADMIN
                  </span>
                )}
              </Link>
              <button
                type="button"
                onClick={() => logout()}
                disabled={isLoggingOut}
                aria-label={t("signOut")}
                className="inline-flex items-center gap-1.5 rounded-[30px] border border-transparent p-2 text-[13px] text-[#57657e] hover:bg-[#f0f5ff] hover:text-red-600 transition-colors"
                title={t("signOut")}
              >
                <LogOutIcon size={16} />
              </button>
            </div>
          ) : (
            <Link
              href="/account"
              className="hidden sm:inline-flex items-center gap-2 rounded-[30px] border border-primary bg-primary px-4 py-2 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-primary/90"
            >
              <UserIcon size={15} />
              <span>{t("signIn")}</span>
            </Link>
          )}

          {/* Mobile hamburger */}
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-[8px] border border-[#e0e6f1] p-2 text-[#57657e] hover:bg-[#f0f5ff] hover:text-primary md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <XIcon size={20} /> : <MenuIcon size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="border-b border-[#e0e6f1] bg-white px-6 py-4 shadow-lg md:hidden">
          <nav className="flex flex-col space-y-3">
            {links.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-[#f0f5ff] text-primary font-semibold"
                      : "text-[#57657e] hover:bg-[#f0f5ff]/60 hover:text-primary"
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
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-[#25314c] hover:bg-[#f0f5ff]"
                  >
                    <UserIcon size={16} />
                    <span>{user.name} ({user.role})</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="text-xs font-semibold text-red-600 px-3 py-2"
                  >
                    {t("signOut")}
                  </button>
                </div>
              ) : (
                <Link
                  href="/account"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-primary hover:bg-[#f0f5ff]"
                >
                  <UserIcon size={16} />
                  <span>{t("signInOrRegister")}</span>
                </Link>
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
