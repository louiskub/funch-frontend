"use client";

import { useLocaleStore, LOCALES } from "@/features/i18n";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { locale, setLocale } = useLocaleStore();

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-[#e0e6f1] bg-[#f0f5ff]/60 p-0.5 text-xs font-semibold text-[#57657e]",
        className
      )}
      role="group"
      aria-label="Language selection"
    >
      {LOCALES.map((item) => {
        const isActive = locale === item.code;
        return (
          <button
            key={item.code}
            type="button"
            onClick={() => setLocale(item.code)}
            aria-pressed={isActive}
            className={cn(
              "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] transition-all",
              isActive
                ? "bg-white font-bold text-primary shadow-sm"
                : "hover:text-[#25314c]"
            )}
          >
            <span>{item.flag}</span>
            <span>{item.code.toUpperCase()}</span>
          </button>
        );
      })}
    </div>
  );
}
