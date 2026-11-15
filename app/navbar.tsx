"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, Suspense } from "react";
import { UserIcon, MenuIcon, XIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

function NavbarContent() {
  const pathname = usePathname() || "";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = pathname.startsWith("/admin");

  const customerNavLinks = [
    { label: "Find a car", href: "/" },
    { label: "My bookings", href: "/bookings" },
    { label: "Admin portal", href: "/admin/bookings" },
  ];

  const adminNavLinks = [
    { label: "Bookings", href: "/admin/bookings" },
    { label: "Fleet", href: "/admin/fleet" },
    { label: "Options", href: "/admin/options" },
    { label: "Members", href: "/admin/members" },
    { label: "Reports", href: "/admin/reports" },
    { label: "← Back to store", href: "/" },
  ];

  const links = isAdmin ? adminNavLinks : customerNavLinks;

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
          <Link
            href="/account"
            className="hidden sm:inline-flex items-center gap-2 rounded-[30px] border border-[#e0e6f1] bg-white px-4 py-2 text-[13px] font-medium text-[#25314c] transition-colors hover:border-primary hover:text-primary"
          >
            <UserIcon size={16} className="text-[#57657e]" />
            <span>My account</span>
          </Link>

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
              <Link
                href="/account"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-[#25314c] hover:bg-[#f0f5ff]"
              >
                <UserIcon size={16} />
                <span>My account</span>
              </Link>
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
