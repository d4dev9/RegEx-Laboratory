"use client";

import Link from "next/link";

import { useI18n } from "@/lib/i18n/provider";
import { useCopy } from "@/lib/i18n/shared";
import { slashForm } from "@/lib/matcher";
import { PageChrome } from "@/components/shared/PageChrome";

export function PublicPatternContent({
  id,
  name,
  pattern,
  flags,
  tags,
  sharedText,
  author,
}: {

  id: string;
  name: string;
  pattern: string;
  flags: string;
  tags: string[];

  sharedText: string | null;

  author: string | null;
}) {
  const { t } = useI18n();
  const copy = useCopy();
  const literal = slashForm(pattern, flags);

  return (
    <PageChrome meta={{ title: "pub.meta.title", description: "pub.meta.desc" }}>
      <div className="container page">
        <div className="page-head">
          <p className="label">{t("pub.label")}</p>
          <h1 id="p-title">{name}</h1>
          {author && (
            <p className="muted" id="p-by">
              {t("pub.by")} {author}
            </p>
          )}
        </div>

        <pre className="code pub-code">
          <code id="p-code" tabIndex={0}>
            {literal}
          </code>
        </pre>

        <ul className="tags pub-tags" id="p-tags">
          {tags.map((tag) => (
            <li key={tag} className="badge">
              {tag}
            </li>
          ))}
        </ul>

        {sharedText && (
          <div className="panel pub-sample" id="p-sample">
            <p className="label">{t("pub.sample")}</p>
            <pre className="code">
              <code id="p-sample-text" tabIndex={0}>
                {sharedText}
              </code>
            </pre>
          </div>
        )}

        <div className="row-actions pub-actions">
          <button
            type="button"
            className="btn"
            id="p-copy"
            onClick={() => void copy(literal, t("pub.copied"))}
          >
            {t("pub.copy")}
          </button>
          <Link
            href={`/lab#s=${id}`}
            className="btn btn-primary"
            id="p-open"
          >
            {t("pub.open")}
          </Link>
        </div>
      </div>
    </PageChrome>
  );
}
