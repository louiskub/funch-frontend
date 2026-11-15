"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, Suspense } from "react";
import {
  CalendarIcon,
  CarIcon,
  UserIcon,
  ClockIcon,
  ShieldCheckIcon,
} from "@/components/ui/icons";
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

  const navItems = [
    { label: "Bookings", href: "/admin/bookings", icon: CalendarIcon },
    { label: "Fleet", href: "/admin/fleet", icon: CarIcon },
    { label: "Options", href: "/admin/options", icon: ShieldCheckIcon },
    { label: "Members", href: "/admin/members", icon: UserIcon },
    { label: "Reports", href: "/admin/reports", icon: ClockIcon },
  ];

  return (
    <div className="flex min-h-[calc(100vh-82px)] bg-white text-[#25314c]">
      {/* 185px Admin Sidebar per Easy Days 1440 reference */}
      <aside className="hidden lg:flex w-[185px] flex-col border-r border-[#e0e6f1] bg-white p-4 justify-between flex-shrink-0">
        <div>
          <div className="px-2 py-3 mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#57657e] block">
              Workspace
            </span>
            <span className="text-base font-extrabold text-[#25314c]">
              Branch Admin
            </span>
          </div>

          <nav className="space-y-1" aria-label="Admin navigation">
            {navItems.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-[8px] px-3 py-2 text-xs font-semibold transition-colors",
                    active
                      ? "bg-primary text-white shadow-sm"
                      : "text-[#57657e] hover:bg-[#f0f5ff] hover:text-primary"
                  )}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Staff badge */}
        <div className="rounded-[10px] bg-[#f0f5ff] p-3 text-xs border border-[#d7e2f5]">
          <p className="font-bold text-[#25314c] text-[11px]">Staff Profile</p>
          <p className="text-[10px] text-[#57657e] truncate">Admin Console</p>
          <Link
            href="/"
            className="mt-2 block text-[10px] font-bold text-primary hover:underline"
          >
            ← Return to storefront
          </Link>
        </div>
      </aside>

      {/* Main admin body */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Admin Topbar */}
        <header className="flex min-h-[64px] flex-wrap items-center justify-between gap-4 border-b border-[#e0e6f1] px-6 sm:px-8 py-3 bg-[#f0f5ff]/30">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#25314c]">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-[#57657e]">{subtitle}</p>
            )}
          </div>

          {actions && <div className="flex items-center gap-2.5">{actions}</div>}
        </header>

        {/* Mobile secondary tabs */}
        <div className="flex border-b border-[#e0e6f1] px-4 py-2 bg-white lg:hidden overflow-x-auto gap-2">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "whitespace-nowrap rounded-[6px] px-3 py-1.5 text-xs font-semibold",
                  active
                    ? "bg-primary text-white"
                    : "text-[#57657e] hover:bg-[#f0f5ff]"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Content area */}
        <div className="flex-1 p-6 sm:p-8">{children}</div>
      </div>
    </div>
  );
}

export function AdminLayout(props: AdminLayoutProps) {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-[#57657e]">Loading workspace…</div>}>
      <AdminLayoutContent {...props} />
    </Suspense>
  );
}
