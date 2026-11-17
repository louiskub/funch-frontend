"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth";

export default function AdminIndexPage() {
  const { isAdmin, isLoading } = useAuth();
  const t = useTranslations("admin.workspacePages");
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAdmin) {
        router.replace("/admin/bookings");
      } else {
        router.replace("/");
      }
    }
  }, [isAdmin, isLoading, router]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <p className="text-sm font-medium text-muted-foreground">{t("loading")}</p>
    </div>
  );
}
