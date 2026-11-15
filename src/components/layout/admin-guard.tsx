"use client";

import { useAuth, useAuthModalStore } from "@/features/auth";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { AlertCircleIcon, ShieldCheckIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";

export function AdminGuard({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isAdmin, isLoading } = useAuth();
  const { openAuthModal } = useAuthModalStore();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast.error("Please sign in with an Admin account to access this page");
      openAuthModal("login", { redirectUrl: pathname || "/admin/bookings" });
    }
  }, [isLoading, isAuthenticated, openAuthModal, pathname]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm font-medium text-[#57657e]">Verifying admin privileges…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center justify-center py-20 text-center px-4">
        <div className="flex size-14 items-center justify-center rounded-full bg-[#f0f5ff] text-primary mb-4">
          <ShieldCheckIcon size={28} />
        </div>
        <h1 className="text-2xl font-bold text-[#25314c]">Admin Access Required</h1>
        <p className="mt-2 text-sm text-[#57657e]">
          You need to sign in with an Administrator account to view this area.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button
            type="button"
            onClick={() => openAuthModal("login", { redirectUrl: pathname || "/admin/bookings" })}
          >
            Sign in as Admin
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Back to store</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center justify-center py-20 text-center px-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 mb-4">
          <AlertCircleIcon size={32} />
        </div>
        <h1 className="text-2xl font-bold text-[#25314c]">Access Denied</h1>
        <p className="mt-2 text-sm text-[#57657e]">
          You are signed in as <span className="font-semibold">{user?.email}</span> (Customer). This area requires administrator permissions.
        </p>
        <div className="mt-6 flex gap-3">
          <Button asChild variant="outline">
            <Link href="/">Back to store</Link>
          </Button>
          <Button
            type="button"
            onClick={() => openAuthModal("login", { redirectUrl: pathname || "/admin/bookings" })}
          >
            Switch account
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
