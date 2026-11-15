"use client";

import { create } from "zustand";
import type { Locale } from "../types";
import { DEFAULT_LOCALE } from "../types";

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

const STORAGE_KEY = "funch_locale";

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "th") return saved;
  } catch {
    // Ignore storage errors
  }
  return DEFAULT_LOCALE;
}

export const useLocaleStore = create<LocaleState>((set, get) => ({
  locale: DEFAULT_LOCALE,
  setLocale: (locale) => {
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // Ignore storage errors
    }
    set({ locale });
  },
  toggleLocale: () => {
    const next = get().locale === "en" ? "th" : "en";
    get().setLocale(next);
  },
}));

// Hydrate on client start
if (typeof window !== "undefined") {
  const initial = getInitialLocale();
  if (initial !== DEFAULT_LOCALE) {
    useLocaleStore.setState({ locale: initial });
  }
}
