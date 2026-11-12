"use client";

import Link from "next/link";

import { useI18n } from "@/lib/i18n/provider";
import { CopyButton } from "@/lib/i18n/shared";
import { DemoPanel } from "@/components/home/DemoPanel";
import { FEATURED_PATTERNS, literal } from "@/lib/regex/patterns";
import type { DictKey } from "@/lib/i18n/dictionary";

const FEATURES = ["f1", "f2", "f3", "f4", "f5"] as const;

const LANGS = [
  "JavaScript",
  "Python",
  "Go",
  "Rust",
  "Java",
  "C#",
  "PHP",
  "Ruby",
];

export function HomeContent() {
  const { t, lang } = useI18n();

  return (
    <>
      <section className="hero dot-grid">
        <div className="container">
          <h1>{t("hero.h1")}</h1>
          <p className="lead muted">{t("hero.sub")}</p>
          <div className="hero-actions">
            <Link href="/lab" className="btn btn-primary">
              {t("hero.primary")}
            </Link>
            <Link href="/cheatsheet" className="btn">
              {t("hero.secondary")}
            </Link>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="features-title">
        <div className="container">
          <div className="section-head">
            <h2 id="features-title">{t("features.h2")}</h2>
          </div>

          <ol className="rows">
            {FEATURES.map((feature, i) => (
              <li key={feature} className="feature">
                <span className="label">{String(i + 1).padStart(2, "0")}</span>
                <h3>{t(`${feature}.t` as DictKey)}</h3>
                <div>
                  <p className="muted">{t(`${feature}.d` as DictKey)}</p>
                  {feature === "f4" && (
                    <ul className="tags" aria-label={t("f4.langs")}>
                      {LANGS.map((name) => (
                        <li key={name} className="badge">
                          {name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section" aria-labelledby="demo-title">
        <div className="container">
          <div className="section-head">
            <h2 id="demo-title">{t("demo.h2")}</h2>
            <p className="muted demo-sub">{t("demo.sub")}</p>
          </div>

          <DemoPanel />

          <p className="demo-link">
            <Link href="/lab" className="btn">
              {t("demo.open")}
            </Link>
          </p>
        </div>
      </section>

      <section className="section" aria-labelledby="library-title">
        <div className="container">
          <div className="section-head split">
            <div>
              <h2 id="library-title">{t("lib.h2")}</h2>
              <p className="muted lib-sub">{t("lib.sub")}</p>
            </div>
            <Link href="/docs#biblioteca" className="btn">
              {t("lib.all")}
            </Link>
          </div>

          <ul className="rows patterns">
            {FEATURED_PATTERNS.map((p) => {
              const value = literal(p.regex, p.flags);
              return (
                <li key={p.id} className="pattern-row">
                  <h3>{p.name[lang]}</h3>
                  <code tabIndex={0}>{value}</code>
                  <CopyButton value={value} />
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="section">
        <div className="container cta">
          <h2>{t("cta.h2")}</h2>
          <div className="hero-actions">
            <Link href="/lab" className="btn btn-primary">
              {t("cta.primary")}
            </Link>
            <Link href="/docs" className="btn">
              {t("cta.secondary")}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
