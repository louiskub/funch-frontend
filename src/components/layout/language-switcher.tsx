"use client";

import { useLocaleStore } from "@/features/i18n";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { locale, setLocale } = useLocaleStore();
  const t = useTranslations("common");

  return (
    <button
      type="button"
      onClick={() => setLocale(locale === "en" ? "th" : "en")}
      aria-label={t(locale === "en" ? "switchToThai" : "switchToEnglish")}
      className={cn(
        "inline-flex h-11 cursor-pointer items-center rounded-full border border-border bg-surface-soft p-[2px] select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex h-full min-w-12 items-center justify-center rounded-full px-3 text-[12px] font-semibold tracking-wide transition-colors duration-200",
          locale === "en"
            ? "bg-primary text-white shadow-sm"
            : "bg-white text-muted-foreground",
        )}
      >
        EN
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "flex h-full min-w-12 items-center justify-center rounded-full px-3 text-[12px] font-semibold tracking-wide transition-colors duration-200",
          locale === "th"
            ? "bg-primary text-white shadow-sm"
            : "bg-white text-muted-foreground",
        )}
      >
        TH
      </span>
    </button>
  );
}
