"use client";

import { useAuth } from "@/features/auth/hooks/use-auth";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";

export function CustomerGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast.info("Please sign in to view your bookings and account details");
      router.replace(`/account?redirect=${encodeURIComponent(pathname || "/bookings")}`);
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm font-medium text-[#57657e]">Loading your account…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center justify-center py-20 text-center px-4">
        <h1 className="text-2xl font-bold text-[#25314c]">Sign in required</h1>
        <p className="mt-2 text-sm text-[#57657e]">
          You need to be signed in to view this page.
        </p>
        <div className="mt-6 flex gap-3">
          <Button asChild>
            <Link href="/account">Sign in or register</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
