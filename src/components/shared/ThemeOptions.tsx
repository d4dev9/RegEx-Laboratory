"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useHydrated } from "@/hooks/useHydrated";

const options = [
  { value: "light", label: "Claro", Icon: Sun },
  { value: "dark", label: "Oscuro", Icon: Moon },
  { value: "system", label: "Sistema", Icon: Monitor },
] as const;

export function ThemeOptions() {
  const { theme, setTheme } = useTheme();
  const hydrated = useHydrated();

  return (
    <div
      role="radiogroup"
      aria-label="Tema"
      className="grid grid-cols-1 gap-2 sm:grid-cols-3"
    >
      {options.map(({ value, label, Icon }) => {
        const selected = hydrated && theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setTheme(value)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-md border px-4 py-3 text-sm transition-colors",
              selected
                ? "border-[var(--border-hover)] bg-[var(--bg-hover)] text-slate-900 dark:text-slate-50"
                : "text-slate-500 hover:border-[var(--border-hover)] hover:text-slate-900 dark:hover:text-slate-50"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}