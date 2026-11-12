import type { Lang } from "@/lib/regex/core";

export const LANG_KEY = "rl-lang";

export function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeLocal(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {

  }
}

export function isLang(value: string | null): value is Lang {
  return value === "es" || value === "en";
}

export function initialLang(): Lang {
  if (typeof navigator === "undefined") return "es";
  const stored = readLocal(LANG_KEY);
  if (isLang(stored)) return stored;
  return (navigator.language || "es").toLowerCase().startsWith("es") ? "es" : "en";
}

export function langFromCookieValue(
  value: string | null | undefined
): Lang | null {
  const candidate = value ?? null;
  return isLang(candidate) ? candidate : null;
}

export function langFromCookie(header: string | undefined): Lang | null {
  if (!header) return null;
  const found = /(?:^|;\s*)rl-lang=([^;\s]+)/.exec(header)?.[1] ?? null;
  return langFromCookieValue(found);
}

export const LANG_COOKIE = "rl-lang";
