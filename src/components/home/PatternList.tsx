"use client";

import Link from "next/link";

import { useI18n } from "@/lib/i18n/provider";
import { CopyButton } from "@/lib/i18n/shared";
import {
  CATEGORIES,
  PATTERNS,
  literal,
  type LibraryPattern,
} from "@/lib/regex/patterns";

export function LibraryList({ items }: { items: LibraryPattern[] }) {
  const { lang, t } = useI18n();

  return (
    <ul className="rows">
      {items.map((p) => {
        const value = literal(p.regex, p.flags);
        return (
          <li key={p.id} className="lib-row">
            <div className="lib-name">
              <h3>{p.name[lang]}</h3>
              <span className="badge">{CATEGORIES[p.cat][lang]}</span>
            </div>

            <code tabIndex={0}>{value}</code>

            <div className="row-actions">
              <CopyButton value={value} />
              <Link
                href={`/lab#p=${encodeURIComponent(p.regex)}&f=${p.flags}`}
                className="btn btn-sm"
              >
                {t("try")}
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export { PATTERNS };
