import en from "./messages/en.json";
import th from "./messages/th.json";
import type { Locale } from "./types";

export const messages: Record<Locale, typeof en> = {
  en,
  th,
};

export * from "./types";
export * from "./store/use-locale-store";
