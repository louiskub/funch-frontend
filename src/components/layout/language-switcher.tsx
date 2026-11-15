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
        "inline-flex h-[34px] items-center rounded-full border border-[#d7e2f5] bg-[#f0f5ff] p-[3px] select-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]",
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
            ? "bg-white text-primary shadow-[0_2px_4px_rgba(39,71,183,0.1),0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-[#e0e6f1]/70"
            : "text-[#57657e] hover:text-[#25314c]"
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
            ? "bg-white text-primary shadow-[0_2px_4px_rgba(39,71,183,0.1),0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-[#e0e6f1]/70"
            : "text-[#57657e] hover:text-[#25314c]"
        )}
      >
        Th
      </button>
    </div>
  );
}
