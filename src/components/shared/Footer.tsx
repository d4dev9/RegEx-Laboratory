"use client";

import Link from "next/link";

import { useI18n } from "@/lib/i18n/provider";
import { LogoMark } from "@/components/shared/Logo";
import type { DictKey } from "@/lib/i18n/dictionary";

const REPO_URL = "https://github.com/d4dev9/RegEx-Laboratory";

const LINKS: { href: string; label?: string; key?: DictKey }[] = [
  { href: "/lab", key: "nav.lab" },
  { href: "/cheatsheet", label: "Cheatsheet" },
  { href: "/docs", label: "Docs" },
  { href: "/terms", key: "foot.terms" },
  { href: "/privacy", key: "foot.privacy" },
];

export function Footer() {
  const { t } = useI18n();

  return (
    <footer className="footer">
      <div className="container foot">
        <Link href="/" aria-label="Regex Lab" className="wordmark">
          <LogoMark size={20} className="wordmark-mark" />
          <span className="wordmark-text">Regex Lab</span>
        </Link>

        <nav className="foot-links muted" aria-label={t("foot.label")}>
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label ?? t(link.key!)}
            </Link>
          ))}

        </nav>

        <div className="foot-tail">
          <span className="label">&copy; {new Date().getFullYear()} Regex Lab</span>

          <a
            className="foot-github"
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub Repository"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M12 .5C5.73.5.5 5.73.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.5 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.4-5.26 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
