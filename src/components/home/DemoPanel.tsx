"use client";

import { useMemo, useState } from "react";

import { useI18n } from "@/lib/i18n/provider";
import { collectMatches } from "@/lib/matcher";

interface Quick {
  name: string;
  pattern: string;
  text: Record<"es" | "en", string>;
}

const QUICK: Quick[] = [
  {
    name: "Email",
    pattern: "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}",
    text: {
      es: "Contacta con nosotros en soporte@ejemplo.com\no ventas@empresa.org para más info. Sin datos: nope@localhost",
      en: "Contact us at soporte@ejemplo.com\nor ventas@empresa.org for more info. No data: nope@localhost",
    },
  },
  {
    name: "URL",
    pattern: "https?:\\/\\/[\\w-]+(?:\\.[\\w-]+)+(?:\\/[^\\s]*)?",
    text: {
      es: "https://regexlab.indevs.in/lab\nhttps://regexlab.indevs.in/docs",
      en: "https://regexlab.indevs.in/lab\nhttps://regexlab.indevs.in/docs",
    },
  },
  {
    name: "IPv4",
    pattern: "(?:(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)",
    text: {
      es: "192.168.0.1\n10.0.0.255",
      en: "192.168.0.1\n10.0.0.255",
    },
  },
  {
    name: "UUID v4",
    pattern: "[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}",
    text: {
      es: "123e4567-e89b-42d3-a456-426614174000",
      en: "123e4567-e89b-42d3-a456-426614174000",
    },
  },
  {
    name: "ISO 8601",
    pattern: "\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{3})?Z",
    text: {
      es: "2026-10-07T14:30:00Z\n2026-10-07T14:30:00.123Z",
      en: "2026-10-07T14:30:00Z\n2026-10-07T14:30:00.123Z",
    },
  },
  {
    name: "Slug",
    pattern: "[a-z0-9]+(?:-[a-z0-9]+)*",
    text: { es: "regex-lab-demo", en: "regex-lab-demo" },
  },
];

function segments(text: string, spans: { start: number; end: number }[]) {
  const out: { text: string; match: boolean }[] = [];
  let last = 0;
  for (const s of spans) {
    if (s.start > last) out.push({ text: text.slice(last, s.start), match: false });
    out.push({ text: text.slice(s.start, s.end), match: true });
    last = s.end;
  }
  if (last < text.length) out.push({ text: text.slice(last), match: false });
  return out;
}

export function DemoPanel() {
  const { t, lang } = useI18n();

  const [editedText, setEditedText] = useState<string | null>(null);
  const [quick, setQuick] = useState(0);
  const [pattern, setPattern] = useState(QUICK[0].pattern);

  const text = editedText ?? QUICK[quick]?.text[lang] ?? QUICK[0].text[lang];

  const result = useMemo(
    () => collectMatches(pattern, "g", text),
    [pattern, text]
  );

  const spans = useMemo(
    () =>
      result.ok
        ? result.matches.map((m) => ({ start: m.index, end: m.index + m.text.length }))
        : [],
    [result]
  );

  const rendered = useMemo(() => segments(text, spans), [text, spans]);

  const count =
    pattern === ""
      ? t("demo.empty")
      : !result.ok
        ? result.reason === "risky"
          ? t("demo.risky")
          : t("demo.invalid")
        : result.matches.length === 1
          ? t("demo.one")
          : `${result.matches.length}${t("demo.many")}`;

  return (
    <div className="demo">
      <div className="demo-row demo-head">
        <label className="label" htmlFor="demo-pattern">
          {t("demo.pattern")}
        </label>
        <span className="badge" id="count" role="status" aria-live="polite">
          {count}
        </span>
      </div>

      <div className="demo-row">
        <div
          className="pattern-field"
          data-invalid={!result.ok ? "true" : undefined}
        >
          <span aria-hidden="true">/</span>
          <input
            id="demo-pattern"
            value={pattern}
            onChange={(e) => {
              setPattern(e.target.value);
              setQuick(-1);
            }}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
          />
          <span aria-hidden="true">/g</span>
        </div>
      </div>

      <div className="demo-row">
        <label className="label field-label" htmlFor="demo-text">
          {t("demo.text")}
        </label>
        <textarea
          id="demo-text"
          value={text}
          onChange={(e) => setEditedText(e.target.value)}
          rows={3}
          spellCheck={false}
        />
      </div>

      <div className="demo-row">
        <p className="label field-label" id="demo-quick-label">
          {t("demo.quick")}
        </p>
        <div
          className="chips"
          role="group"
          aria-labelledby="demo-quick-label"
        >
          {QUICK.map((q, i) => (
            <button
              key={q.name}
              type="button"
              className="btn"
              aria-pressed={quick === i}
              onClick={() => {
                setQuick(i);
                setPattern(q.pattern);

                setEditedText(null);
              }}
            >
              {q.name}
            </button>
          ))}
        </div>
      </div>

      <div className="demo-row">
        <p className="label field-label">{t("demo.result")}</p>

        <div className="result" aria-live="polite">
          {rendered.map((seg, i) =>
            seg.match ? (
              <mark key={i}>{seg.text}</mark>
            ) : (
              <span key={i}>{seg.text}</span>
            )
          )}
        </div>
      </div>
    </div>
  );
}
