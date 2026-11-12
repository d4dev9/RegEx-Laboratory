"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { useI18n } from "@/lib/i18n/provider";
import { LibraryList } from "@/components/home/PatternList";
import { PageChrome } from "@/components/shared/PageChrome";
import { CATEGORIES, PATTERNS, type PatternCategory } from "@/lib/regex/patterns";
import type { DictKey } from "@/lib/i18n/dictionary";

function norm(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

const SECTIONS = [
  { id: "empezar", key: "docs.s1" },
  { id: "guardar", key: "docs.s2" },
  { id: "flancos", key: "docs.s3" },
  { id: "errores", key: "docs.s4" },
  { id: "biblioteca", key: "docs.s5" },
] as const;

function useActiveSection(ids: readonly string[], offset: number) {
  const [active, setActive] = useState<string | null>(ids[0] ?? null);

  useEffect(() => {
    const visible = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id;
          if (entry.isIntersecting) visible.add(id);
          else visible.delete(id);
        }

        const inOrder = ids.filter((id) => visible.has(id));
        if (inOrder.length > 0) {

          setActive(inOrder[inOrder.length - 1]);
          return;
        }

        const atBottom =
          window.innerHeight + window.scrollY >=
          document.documentElement.scrollHeight - 2;
        if (atBottom) setActive(ids[ids.length - 1]);
      },
      {

        rootMargin: `-${offset}px 0px -70% 0px`,
        threshold: 0,
      }
    );

    const targets = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    for (const el of targets) observer.observe(el);
    return () => observer.disconnect();
  }, [ids, offset]);

  return active;
}

const FAQ = [
  { t: "docs.e1.t", d: "docs.e1.d" },
  { t: "docs.e2.t", d: "docs.e2.d" },
  { t: "docs.e3.t", d: "docs.e3.d" },
  { t: "docs.e4.t", d: "docs.e4.d" },
] as const;

const FLAG_ROWS = ["g", "i", "m", "s", "u", "y"] as const;

export function DocsContent() {
  const { t, lang } = useI18n();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<PatternCategory | "">("");

  const sectionIds = useMemo(() => SECTIONS.map((s) => s.id), []);
  const activeSection = useActiveSection(sectionIds, 96);

  const usedCategories = useMemo(() => {
    const seen: PatternCategory[] = [];
    for (const p of PATTERNS) if (!seen.includes(p.cat)) seen.push(p.cat);
    return seen;
  }, []);

  const filtered = useMemo(() => {
    const q = norm(query.trim());
    return PATTERNS.filter((p) => {
      if (category && p.cat !== category) return false;
      if (!q) return true;
      return norm(
        `${p.name.es} ${p.name.en} ${CATEGORIES[p.cat][lang]} ${p.regex} ${p.flags}`
      ).includes(q);
    });
  }, [query, category, lang]);

  return (
    <PageChrome meta={{ title: "docs.meta.title", description: "docs.meta.desc" }}>
      <div className="container page">
        <div className="page-head">
          <h1>{t("docs.h1")}</h1>
          <p className="muted">{t("docs.sub")}</p>
        </div>

        <div className="doc-layout">
          <nav className="toc" aria-label={t("docs.toc")}>
            <ul>
              {SECTIONS.map((section) => {
                const current = activeSection === section.id;
                return (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className={current ? "is-active" : undefined}

                      aria-current={current ? "true" : undefined}
                    >
                      {t(section.key)}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="prose">
            <section id="empezar" aria-labelledby="h-empezar">
              <h2 id="h-empezar">{t("docs.s1")}</h2>
              <p>{t("docs.p1")}</p>
              <Link href="/lab" className="btn btn-primary">
                {t("docs.open")}
              </Link>
            </section>

            <section id="guardar" aria-labelledby="h-guardar">
              <h2 id="h-guardar">{t("docs.s2")}</h2>
              <p>{t("docs.p2")}</p>
              <p>{t("docs.p3")}</p>
            </section>

            <section id="flancos" aria-labelledby="h-flancos">
              <h2 id="h-flancos">{t("docs.s3")}</h2>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">{t("docs.fl.flag")}</th>
                      <th scope="col">{t("docs.fl.desc")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FLAG_ROWS.map((flag) => (
                      <tr key={flag}>
                        <td>{flag}</td>
                        <td>{t(`flag.${flag}` as DictKey)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section id="errores" aria-labelledby="h-errores">
              <h2 id="h-errores">{t("docs.s4")}</h2>
              <ol className="rows">
                {FAQ.map((item, i) => (
                  <li key={item.t} className="feature">
                    <span className="label">{String(i + 1).padStart(2, "0")}</span>
                    <h3>{t(item.t)}</h3>
                    <p className="muted">{t(item.d)}</p>
                  </li>
                ))}
              </ol>
            </section>

            <section id="biblioteca" aria-labelledby="h-biblioteca">
              <h2 id="h-biblioteca">{t("docs.s5")}</h2>

              <div className="controls">
                <div className="search">
                  <label className="sr-only" htmlFor="dl-search">
                    {t("dl.search")}
                  </label>
                  <input
                    id="dl-search"
                    className="input"
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    spellCheck={false}
                    autoComplete="off"
                    placeholder={t("dl.search")}
                  />
                </div>

                <div>
                  <label className="sr-only" htmlFor="dl-cat">
                    {t("dl.cat")}
                  </label>
                  <select
                    id="dl-cat"
                    className="input"
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as PatternCategory | "")
                    }
                  >
                    <option value="">{t("dl.all")}</option>
                    {usedCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {CATEGORIES[cat][lang]}
                      </option>
                    ))}
                  </select>
                </div>

                <p className="label count" role="status" aria-live="polite">
                  {filtered.length === 0
                    ? t("dl.none")
                    : filtered.length === 1
                      ? t("dl.one")
                      : `${filtered.length}${t("dl.many")}`}
                </p>
              </div>

              <LibraryList items={filtered} />
            </section>
          </div>
        </div>
      </div>
    </PageChrome>
  );
}
