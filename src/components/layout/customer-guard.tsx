"use client";

import { useTranslations } from "next-intl";
import { useAuth, useAuthModalStore } from "@/features/auth";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";

export function CustomerGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const t = useTranslations("common");
  const { openAuthModal } = useAuthModalStore();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast.info(t("signInToView"));
      openAuthModal("login", { redirectUrl: pathname || "/bookings" });
    }
  }, [isLoading, isAuthenticated, openAuthModal, pathname, t]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm font-medium text-muted-foreground">{t("loadAccount")}</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center justify-center py-20 text-center px-4">
        <h1 className="text-2xl font-bold text-foreground">{t("signInRequired")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("mustSignIn")}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button
            type="button"
            onClick={() => openAuthModal("login", { redirectUrl: pathname || "/bookings" })}
          >
            {t("signIn")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => openAuthModal("register", { redirectUrl: pathname || "/bookings" })}
          >
            {t("createAccount")}
          </Button>
          <Button asChild variant="ghost">
            <Link href="/">{t("backToHome")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
