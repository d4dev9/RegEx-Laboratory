"use client";

import { useCallback } from "react";

import { useI18n } from "@/lib/i18n/provider";
import { useToast } from "@/components/shared/Toast";
import type { Lang } from "@/lib/regex/core";

export function LanguageToggle() {
  const { lang, setLang, t } = useI18n();

  return (
    <div className="lang" role="group" aria-label={t("lang.label")}>
      {(["es", "en"] as Lang[]).map((code) => (
        <button
          key={code}
          type="button"
          className="lang-btn"
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
        >
          {code}
        </button>
      ))}
    </div>
  );
}

export function useCopy(): (value: string, label?: string) => Promise<boolean> {
  const { t } = useI18n();
  const raise = useToast();

  return useCallback(
    async (value: string, label?: string) => {
      let ok = false;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(value);
          ok = true;
        } else {

          const ta = document.createElement("textarea");
          ta.value = value;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          ok = document.execCommand("copy");
          document.body.removeChild(ta);
        }
      } catch {
        ok = false;
      }

      raise(ok ? (label ?? t("copied")) : t("copy.failed"));
      return ok;
    },
    [raise, t]
  );
}

export function CopyButton({
  value,
  label,
  className = "",
  message,
}: {
  value: string;
  label?: string;
  className?: string;

  message?: string;
}) {
  const copy = useCopy();

  return (
    <button
      type="button"
      className={`btn btn-sm ${className}`.trim()}
      onClick={() => void copy(value, message)}
    >
      {label ?? <CopyGlyph />}
    </button>
  );
}

export function CopyGlyph() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
