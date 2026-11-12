"use client";

import { useTheme } from "next-themes";

import { useI18n } from "@/lib/i18n/provider";
import { useHydrated } from "@/hooks/useHydrated";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const { t } = useI18n();
  const hydrated = useHydrated();

  const dark = hydrated && resolvedTheme === "dark";

  return (
    <button
      type="button"
      id="theme-toggle"
      className="icon-btn"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={dark ? t("theme.to.light") : t("theme.to.dark")}
      aria-pressed={dark}
      title={dark ? t("theme.to.light") : t("theme.to.dark")}
    >
      {dark ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}

function MoonIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}
