"use client";

import { useState } from "react";

import { useI18n } from "@/lib/i18n/provider";
import { useCopy } from "@/lib/i18n/shared";
import { LANGS, explain, exportCode, type ExportLang } from "@/lib/regex/core";
import { Transition } from "@/components/shared/Portal";
import { AuthOverlay } from "@/components/account/AuthDialog";
import type { DictKey } from "@/lib/i18n/dictionary";

export interface PaletteItem {

  l: string;

  i?: string;

  w?: [string, string];
}

export interface PaletteGroup {
  k: "anchors" | "quant" | "classes" | "groups" | "look" | "alt";
  open: boolean;
  items: PaletteItem[];
}

export const PALETTE: PaletteGroup[] = [
  {
    k: "anchors",
    open: true,
    items: [{ l: "^" }, { l: "$" }, { l: "\\A" }, { l: "\\z" }, { l: "\\b" }, { l: "\\B" }],
  },
  {
    k: "quant",
    open: true,
    items: [
      { l: "*" },
      { l: "+" },
      { l: "?" },
      { l: "*?" },
      { l: "+?" },
      { l: "??" },
      { l: "{n}", i: "{2}" },
      { l: "{n,}", i: "{2,}" },
      { l: "{n,m}", i: "{2,4}" },
    ],
  },
  {
    k: "classes",
    open: true,
    items: [
      { l: "." },
      { l: "\\d" },
      { l: "\\D" },
      { l: "\\w" },
      { l: "\\W" },
      { l: "\\s" },
      { l: "\\S" },
      { l: "[abc]" },
      { l: "[^abc]" },
      { l: "[a-z]" },
      { l: "[0-9]" },
    ],
  },
  {
    k: "groups",
    open: false,
    items: [
      { l: "(...)", w: ["(", ")"] },
      { l: "(?:...)", w: ["(?:", ")"] },
      { l: "(?<name>...)", w: ["(?<name>", ")"] },
    ],
  },
  {
    k: "look",
    open: false,
    items: [
      { l: "(?=...)", w: ["(?=", ")"] },
      { l: "(?!...)", w: ["(?!", ")"] },
      { l: "(?<=...)", w: ["(?<=", ")"] },
      { l: "(?<!...)", w: ["(?<!", ")"] },
    ],
  },
  { k: "alt", open: false, items: [{ l: "|" }, { l: "\\." }, { l: "\\|" }] },
];

function itemSource(item: PaletteItem): string {
  return item.w ? item.w[0] + item.w[1] : (item.i ?? item.l);
}

function describe(item: PaletteItem, lang: "es" | "en"): string {
  const tokens = explain(itemSource(item));
  return tokens.length ? tokens[0][lang] : "";
}

export function TokenPalette({
  onInsert,
}: {
  onInsert: (item: PaletteItem) => void;
}) {
  const { t, lang } = useI18n();

  return (
    <aside className="panel palette" aria-labelledby="pal-title">
      <div className="panel-head">
        <h2 id="pal-title" className="label">
          {t("pal.title")}
        </h2>
      </div>

      <p className="hint muted">{t("pal.hint")}</p>

      <div id="palette">
        {PALETTE.map((group) => (
          <details key={group.k} open={group.open}>
            <summary>{t(`pal.${group.k}` as DictKey)}</summary>
            <ul className="tokens">
              {group.items.map((item) => (
                <li key={item.l}>
                  <button
                    type="button"
                    className="tok-btn"
                    title={describe(item, lang)}
                    onClick={() => onInsert(item)}
                  >
                    {item.l}
                  </button>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </aside>
  );
}

export const FLAGS = ["g", "i", "m", "s", "u", "y"] as const;
export type Flag = (typeof FLAGS)[number];

export const DEFAULT_FLAGS = "gm";

export function FlagToggles({
  flags,
  onToggle,
}: {
  flags: string;
  onToggle: (flag: Flag) => void;
}) {
  const { t } = useI18n();

  return (
    <div
      className="flags"
      id="flags"
      role="group"
      aria-labelledby="flags-title"
    >
      {FLAGS.map((flag) => {
        const description = t(`flag.${flag}` as DictKey);
        const on = flags.includes(flag);
        return (
          <button
            key={flag}
            type="button"
            className="flag-btn"
            data-flag={flag}
            aria-pressed={on}
            aria-label={description}
            title={description}
            onClick={() => onToggle(flag)}
          >
            {flag}
          </button>
        );
      })}
    </div>
  );
}

export function ExportDialog({
  open,
  onOpenChange,
  pattern,
  flags,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pattern: string;
  flags: string;
}) {
  const { t } = useI18n();
  const [lang, setLang] = useState<ExportLang>("javascript");
  const copy = useCopy();

  const { code, notes } = exportCode(lang, pattern, flags);

  return (
    <Transition open={open}>
      {(state) => (
        <AuthOverlay
          open={open && state === "open"}
          onOpenChange={onOpenChange}
          title={t("exp.title")}
          titleId="export-title"
          narrow={false}
        >
          <p className="label field-label" id="exp-lang-label">
            {t("exp.langs")}
          </p>
          <div
            className="chips"
            id="exp-chips"
            role="group"
            aria-labelledby="exp-lang-label"
          >
            {LANGS.map(([code2, name]) => (
              <button
                key={code2}
                type="button"
                className="btn"
                aria-pressed={lang === code2}
                onClick={() => setLang(code2)}
              >
                {name}
              </button>
            ))}
          </div>

          <pre className="code">
            <code id="exp-code" tabIndex={0}>
              {code}
            </code>
          </pre>

          {notes.length > 0 && (
            <ul className="notes muted" id="exp-notes">
              {notes.map((note) => (
                <li key={note}>{t(`exp.note.${note}` as DictKey)}</li>
              ))}
            </ul>
          )}

          <div className="dlg-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void copy(code, t("exp.copied"))}
            >
              {t("exp.copy")}
            </button>
          </div>
        </AuthOverlay>
      )}
    </Transition>
  );
}

export function CloseIcon() {
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
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
