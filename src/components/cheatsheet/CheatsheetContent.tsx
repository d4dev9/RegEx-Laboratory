"use client";

import Link from "next/link";
import { useState } from "react";

import { useI18n } from "@/lib/i18n/provider";
import { CopyGlyph, useCopy } from "@/lib/i18n/shared";
import { PageChrome } from "@/components/shared/PageChrome";

interface Row {
  t: string;
  es: string;
  en: string;

  p?: string;
  f?: string;
}

interface Section {
  id: string;
  es: string;
  en: string;
  rows: Row[];
}

const SECTIONS: Section[] = [
  {
    id: "anclas",
    es: "Anclas",
    en: "Anchors",
    rows: [
      { t: "^", es: "Inicio del texto o de la línea", en: "Start of the string or line", p: "^\\w+", f: "gm" },
      { t: "$", es: "Fin del texto o de la línea", en: "End of the string or line", p: "\\w+$", f: "gm" },
      { t: "\\b", es: "Límite de palabra", en: "Word boundary", p: "\\bcat\\b" },
      { t: "\\B", es: "Posición que no es un límite de palabra", en: "Not a word boundary", p: "\\Bat" },
    ],
  },
  {
    id: "clases",
    es: "Clases de caracteres",
    en: "Character classes",
    rows: [
      { t: ".", es: "Cualquier carácter excepto salto de línea", en: "Any character except a line break" },
      { t: "\\d", es: "Un dígito (0-9)", en: "A digit (0-9)" },
      { t: "\\w", es: "Carácter de palabra: letra, dígito o guion bajo", en: "Word character: letter, digit or underscore" },
      { t: "\\s", es: "Espacio en blanco", en: "Whitespace" },
      { t: "\\D", es: "Cualquier carácter que no sea un dígito", en: "Any character that is not a digit" },
      { t: "\\W", es: "Cualquier carácter que no sea de palabra", en: "Any character that is not a word character" },
      { t: "\\S", es: "Cualquier carácter que no sea espacio en blanco", en: "Any character that is not whitespace" },
      { t: "[abc]", es: "Cualquiera de los caracteres del conjunto", en: "Any character in the set" },
      { t: "[a-z]", es: "Cualquier carácter del rango", en: "Any character in the range" },
      { t: "[^abc]", es: "Cualquier carácter que no esté en el conjunto", en: "Any character not in the set" },
    ],
  },
  {
    id: "cuantificadores",
    es: "Cuantificadores",
    en: "Quantifiers",
    rows: [
      { t: "*", es: "Cero o más veces (voraz)", en: "Zero or more times (greedy)", p: "\\d*" },
      { t: "+", es: "Una o más veces (voraz)", en: "One or more times (greedy)", p: "\\d+" },
      { t: "?", es: "Opcional: cero o una vez", en: "Optional: zero or one time", p: "colou?r" },
      { t: "{n}", es: "Exactamente n veces", en: "Exactly n times", p: "\\d{3}" },
      { t: "{n,}", es: "n o más veces", en: "n or more times", p: "\\d{2,}" },
      { t: "{n,m}", es: "Entre n y m veces", en: "Between n and m times", p: "\\d{2,4}" },
      { t: "*?", es: "Cero o más veces, perezoso: lo más corto posible", en: "Zero or more times, lazy: as few as possible", p: "<.*?>" },
    ],
  },
  {
    id: "grupos",
    es: "Grupos y alternancia",
    en: "Groups and alternation",
    rows: [
      { t: "(...)", es: "Grupo de captura", en: "Capturing group", p: "(\\d+)-(\\d+)" },
      { t: "(?:...)", es: "Grupo sin captura", en: "Non-capturing group", p: "(?:ab)+" },
      { t: "(?<name>...)", es: "Grupo de captura con nombre", en: "Named capturing group", p: "(?<year>\\d{4})-(?<month>\\d{2})" },
      { t: "\\1", es: "Referencia al primer grupo capturado", en: "Backreference to the first captured group", p: "(\\w)\\1" },
      { t: "|", es: "Alternancia: una opción u otra", en: "Alternation: one option or the other", p: "cat|dog" },
    ],
  },
  {
    id: "lookarounds",
    es: "Lookarounds",
    en: "Lookarounds",
    rows: [
      { t: "(?=...)", es: "Lookahead positivo: lo siguiente debe coincidir", en: "Positive lookahead: what follows must match", p: "\\d+(?= EUR)" },
      { t: "(?!...)", es: "Lookahead negativo: lo siguiente no debe coincidir", en: "Negative lookahead: what follows must not match", p: "\\d+(?! EUR)" },
      { t: "(?<=...)", es: "Lookbehind positivo: lo anterior debe coincidir", en: "Positive lookbehind: what precedes must match", p: "(?<=\\$)\\d+" },
      { t: "(?<!...)", es: "Lookbehind negativo: lo anterior no debe coincidir", en: "Negative lookbehind: what precedes must not match", p: "(?<!\\$)\\b\\d+" },
    ],
  },
  {
    id: "flags",
    es: "Flags",
    en: "Flags",
    rows: [
      { t: "g", es: "Búsqueda global: todas las coincidencias", en: "Global search: all matches", p: "\\d+", f: "g" },
      { t: "i", es: "Ignora mayúsculas y minúsculas", en: "Case-insensitive", p: "[a-z]+", f: "gi" },
      { t: "m", es: "^ y $ actúan en cada línea", en: "^ and $ work on each line", p: "^\\w+", f: "gm" },
      { t: "s", es: "El punto también coincide con saltos de línea", en: "The dot also matches line breaks", p: "a.b", f: "gs" },
      { t: "u", es: "Modo Unicode", en: "Unicode mode", p: "\\p{L}+", f: "gu" },
      { t: "y", es: "Sticky: busca solo desde la posición actual", en: "Sticky: match only from the current position", p: "\\d", f: "gy" },
    ],
  },
  {
    id: "escapes",
    es: "Escapes útiles",
    en: "Useful escapes",
    rows: [
      { t: "\\.", es: "Punto literal", en: "Literal dot" },
      { t: "\\/", es: "Barra literal", en: "Literal slash" },
      { t: "\\n", es: "Salto de línea", en: "Line break" },
      { t: "\\t", es: "Tabulación", en: "Tab" },
      { t: "\\xHH", es: "Carácter por su código hexadecimal", en: "Character by its hexadecimal code", p: "\\x41" },
    ],
  },
];

function norm(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function CheatsheetContent() {
  const { t, lang } = useI18n();
  const [query, setQuery] = useState("");

  const q = norm(query.trim());
  const sections = SECTIONS.map((section) => ({
    ...section,
    rows: section.rows.filter((row) =>
      !q ? true : norm(`${row.t} ${row[lang]} ${section[lang]}`).includes(q)
    ),
  })).filter((section) => section.rows.length > 0);

  const total = sections.reduce((n, s) => n + s.rows.length, 0);

  return (
    <PageChrome meta={{ title: "cs.meta.title", description: "cs.meta.desc" }}>
      <div className="container page">
        <div className="page-head">
          <h1>{t("cs.h1")}</h1>
          <p className="muted">{t("cs.sub")}</p>
        </div>

        <div className="toolbar-row">
          <div className="search">
            <label className="sr-only" htmlFor="cs-search">
              {t("cs.search")}
            </label>
            <input
              id="cs-search"
              className="input"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              spellCheck={false}
              autoComplete="off"
              placeholder={t("cs.search")}
            />
          </div>
          <p className="label" id="cs-count" role="status" aria-live="polite">
            {total === 0
              ? t("cs.none")
              : total === 1
                ? t("cs.one")
                : `${total}${t("cs.many")}`}
          </p>
        </div>

        <nav className="cheat-nav" aria-label={t("cs.sections")}>
          {sections.map((section) => (
            <a key={section.id} href={`#${section.id}`} className="btn btn-sm">
              {section[lang]}
            </a>
          ))}
        </nav>

        <div id="cs-list">
          {sections.map((section) => (
            <section
              key={section.id}
              className="cheat-section"
              id={section.id}
              aria-labelledby={`h-${section.id}`}
            >
              <h2 id={`h-${section.id}`}>{section[lang]}</h2>

              <ul className="rows">
                {section.rows.map((row) => (
                  <CheatRow key={`${section.id}-${row.t}`} row={row} />
                ))}
              </ul>
            </section>
          ))}
        </div>

        <section className="cheat-cta" aria-labelledby="cs-cta">
          <h2 id="cs-cta">{t("cs.cta.h2")}</h2>
          <p className="muted">{t("cs.cta.p")}</p>
          <Link href="/lab" className="btn btn-primary">
            {t("cs.cta.btn")}
          </Link>
        </section>
      </div>
    </PageChrome>
  );
}

function CheatRow({ row }: { row: Row }) {
  const { t, lang } = useI18n();
  const copy = useCopy();

  return (
    <li className="cheat-row">
      <code>{row.t}</code>
      <span className="muted">{row[lang]}</span>
      <div className="row-actions">
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => void copy(row.t)}
        >
          <CopyGlyph />
        </button>
        <Link href={tryHref(row)} className="btn btn-sm">
          {t("cs.try")}
        </Link>
      </div>
    </li>
  );
}

function tryHref(row: Row): string {
  const q = new URLSearchParams();
  q.set("p", row.p ?? row.t);
  if (row.f) q.set("f", row.f);
  return "/lab#" + q.toString();
}
