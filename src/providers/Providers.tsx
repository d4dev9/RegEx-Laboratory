"use client";

import { ThemeProvider } from "next-themes";
import { ReactNode } from "react";

import { AuthProvider } from "@/components/account/AuthProvider";
import { ToastProvider } from "@/components/shared/Toast";
import { I18nProvider } from "@/lib/i18n/provider";
import type { Lang } from "@/lib/regex/core";

export function Providers({
  children,
  defaultLang,
}: {
  children: ReactNode;
  defaultLang: Lang;
}) {
  return (

    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      disableTransitionOnChange
    >
      <I18nProvider defaultLang={defaultLang}>

        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
