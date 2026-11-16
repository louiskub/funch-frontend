"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, Suspense } from "react";
import { useTranslations } from "next-intl";
import { BarChart3, Package, Users } from "lucide-react";
import { CalendarIcon, CarIcon, UserIcon } from "@/components/ui/icons";
import { AdminGuard } from "@/components/layout/admin-guard";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { cn } from "@/lib/utils";

interface AdminLayoutProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

function AdminLayoutContent({
  title,
  subtitle,
  actions,
  children,
}: AdminLayoutProps) {
  const pathname = usePathname() || "";
  const t = useTranslations("admin");
  const tNav = useTranslations("nav");
  const { user } = useAuth();

  const navItems = [
    { label: t("bookings"), href: "/admin/bookings", icon: CalendarIcon },
    { label: t("fleet"), href: "/admin/fleet", icon: CarIcon },
    { label: t("options"), href: "/admin/options", icon: Package },
    { label: t("members"), href: "/admin/members", icon: Users },
    { label: t("reports"), href: "/admin/reports", icon: BarChart3 },
  ];

  return (
    <div className="flex min-h-[calc(100vh-65px)] bg-card text-foreground">
      <aside
        aria-label={t("branchAdmin")}
        className="sticky top-[65px] hidden h-[calc(100dvh-65px)] w-[185px] shrink-0 flex-col border-r border-border bg-card p-3 lg:flex"
      >
        <p className="shrink-0 px-3 pb-5 pt-4 text-sm font-semibold leading-6">
          {t("branchAdmin")}
        </p>

        <nav
          className="min-h-0 flex-1 space-y-1 overflow-y-auto pb-4"
          aria-label={t("navigation")}
        >
          {navItems.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-2.5 rounded-[8px] px-3 py-2.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none",
                  active
                    ? "bg-primary text-white focus-visible:outline-white"
                    : "text-muted-foreground hover:bg-secondary hover:text-primary",
                )}
              >
                <Icon size={17} aria-hidden="true" className="shrink-0" />
                <span className="min-w-0 break-words leading-5">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-border pt-3">
          <Link
            href="/account"
            aria-label={`${tNav("account")}: ${user?.name ?? t("branchAdmin")}`}
            title={user?.email}
            className="flex min-h-16 min-w-0 items-center gap-2.5 rounded-[10px] px-2 py-3 hover:bg-secondary focus-visible:outline-2 focus-visible:outline-primary"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
              <UserIcon size={16} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold">
                {user?.name ?? t("branchAdmin")}
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {tNav("account")}
              </span>
            </span>
          </Link>
        </div>
      </aside>

      {/* Main admin body */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Admin Topbar */}
        <header className="flex min-h-[64px] flex-wrap items-center justify-between gap-4 border-b border-border px-6 sm:px-8 py-3 bg-secondary/30">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>

          {actions && (
            <div className="flex items-center gap-2.5">{actions}</div>
          )}
        </header>

        {/* Mobile secondary tabs */}
        <nav
          aria-label={t("navigation")}
          className="flex border-b border-border px-4 py-2 bg-card lg:hidden overflow-x-auto gap-2"
        >
          {navItems.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center whitespace-nowrap rounded-[6px] px-3 py-1.5 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-primary focus-visible:-outline-offset-2",
                  active
                    ? "bg-primary text-white"
                    : "text-muted-foreground hover:bg-secondary",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Content area */}
        <div className="flex-1 p-6 sm:p-8">{children}</div>
      </div>
    </div>
  );
}

export function AdminLayout(props: AdminLayoutProps) {
  return (
    <AdminGuard>
      <Suspense
        fallback={
          <div className="p-8 text-sm text-muted-foreground">Loading workspace…</div>
        }
      >
        <AdminLayoutContent {...props} />
      </Suspense>
    </AdminGuard>
  );
}
