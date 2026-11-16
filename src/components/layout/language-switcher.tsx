"use client";

import { useLocaleStore } from "@/features/i18n";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { locale, setLocale } = useLocaleStore();

  return (
    <div
      className={cn(
        "inline-flex h-[34px] items-center rounded-full border border-border bg-secondary p-[3px] select-none shadow-[inset_0_1px_2px_color-mix(in_srgb,var(--overlay) 3%, transparent)]",
        className
      )}
      role="group"
      aria-label="Language selection"
    >
      <button
        type="button"
        onClick={() => setLocale("en")}
        aria-pressed={locale === "en"}
        className={cn(
          "relative flex h-full items-center justify-center rounded-full px-3 text-[12px] font-semibold tracking-wide transition-all duration-200 ease-out active:scale-95",
          locale === "en"
            ? "bg-card text-primary shadow-[0_2px_4px_color-mix(in_srgb,rgb(var(--primary-shadow-color)) 10%, transparent),0_1px_2px_color-mix(in_srgb,var(--overlay) 4%, transparent)] ring-1 ring-border/70"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        En
      </button>

      <button
        type="button"
        onClick={() => setLocale("th")}
        aria-pressed={locale === "th"}
        className={cn(
          "relative flex h-full items-center justify-center rounded-full px-3 text-[12px] font-semibold tracking-wide transition-all duration-200 ease-out active:scale-95",
          locale === "th"
            ? "bg-card text-primary shadow-[0_2px_4px_color-mix(in_srgb,rgb(var(--primary-shadow-color)) 10%, transparent),0_1px_2px_color-mix(in_srgb,var(--overlay) 4%, transparent)] ring-1 ring-border/70"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        Th
      </button>
    </div>
  );
}
