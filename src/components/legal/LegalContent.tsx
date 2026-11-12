"use client";

import Link from "next/link";

import { useI18n } from "@/lib/i18n/provider";
import { PageChrome } from "@/components/shared/PageChrome";
import type { DictKey } from "@/lib/i18n/dictionary";

export function LegalContent({ kind }: { kind: "terms" | "privacy" }) {
  const { t } = useI18n();

  const sections: { id: string; title: DictKey; paragraphs: DictKey[] }[] =
    kind === "terms"
      ? [
          { id: "l-1", title: "terms.s1", paragraphs: ["terms.p1"] },
          { id: "l-2", title: "terms.s2", paragraphs: ["terms.p2"] },
          { id: "l-3", title: "terms.s3", paragraphs: ["terms.p3"] },
          { id: "l-4", title: "terms.s4", paragraphs: ["terms.p4"] },
          { id: "l-5", title: "terms.s5", paragraphs: ["terms.p5"] },
        ]
      : [
          { id: "l-1", title: "priv.s1", paragraphs: ["priv.p1a", "priv.p1b"] },
          { id: "l-2", title: "priv.s2", paragraphs: ["priv.p2a", "priv.p2b"] },
          { id: "l-3", title: "priv.s3", paragraphs: ["priv.p3a", "priv.p3b"] },
          { id: "l-4", title: "priv.s4", paragraphs: ["priv.p4a"] },
          { id: "l-5", title: "priv.s5", paragraphs: ["priv.p5a"] },
          {
            id: "l-6",
            title: "priv.contact.h",
            paragraphs: ["priv.contact.p"],
          },
        ];

  return (
    <PageChrome
      meta={{
        title: kind === "terms" ? "terms.meta.title" : "priv.meta.title",
        description: kind === "terms" ? "terms.meta.desc" : "priv.meta.desc",
      }}
    >
      <div className="container page">
        <div className="page-head">
          <p className="label">{t("legal.updated")}</p>
          <h1>{kind === "terms" ? t("terms.h1") : t("priv.h1")}</h1>
        </div>

        <div className="prose">
          {sections.map((section, i) => (
            <section
              key={section.id}
              aria-labelledby={section.id}
              className={i === 0 ? "" : undefined}
            >
              <h2 id={section.id}>{t(section.title)}</h2>
              {section.paragraphs.map((p) => (
                <p key={p}>{t(p)}</p>
              ))}
            </section>
          ))}
        </div>

        <p className="muted" style={{ marginTop: "var(--space-12)" }}>
          {t("legal.other")}{" "}
          {kind === "terms" ? (
            <Link href="/privacy">{t("priv.h1")}</Link>
          ) : (
            <Link href="/terms">{t("terms.h1")}</Link>
          )}
          .
        </p>
      </div>
    </PageChrome>
  );
}
