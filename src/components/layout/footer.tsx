"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/features/auth";
import { useTranslations } from "next-intl";

export function Footer() {
  const pathname = usePathname() || "";
  const { isAdmin } = useAuth();
  const t = useTranslations("nav");
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return null;

  return (
    <footer className="border-t border-border bg-card py-12 text-muted-foreground">
      <div className="mx-auto max-w-[1280px] px-6 sm:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <span className="text-[26px] font-extrabold tracking-[-0.04em] text-muted-foreground">
            Calrentar
          </span>
          <span className="text-xs text-muted-foreground/70">
            · Car rental, made simple
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-primary transition-colors">
            {t("findCar")}
          </Link>
          <Link href="/bookings" className="hover:text-primary transition-colors">
            {t("myBookings")}
          </Link>
          <Link href="/account" className="hover:text-primary transition-colors">
            {t("account")}
          </Link>
          {isAdmin && (
            <Link
              href="/admin/bookings"
              className="text-primary font-semibold hover:underline transition-colors"
            >
              {t("adminPortal")}
            </Link>
          )}
        </div>
        <p className="text-xs text-muted-foreground/60">
          © 2026 Calrentar Car Rental. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
