"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { Toaster } from "sonner";
import { getQueryClient } from "@/lib/query-client";
import { messages, useLocaleStore } from "@/features/i18n";
import { AuthModal } from "@/features/auth";
import { type ReactNode, useState } from "react";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => getQueryClient());
  const { locale } = useLocaleStore();

  return (
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider
        locale={locale}
        messages={messages[locale]}
        timeZone="Asia/Bangkok"
      >
        {children}
        <AuthModal />
        <Toaster position="bottom-right" richColors closeButton />
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}
