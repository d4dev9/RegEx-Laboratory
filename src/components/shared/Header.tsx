"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useI18n } from "@/lib/i18n/provider";
import { LanguageToggle } from "@/lib/i18n/shared";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { AccountButton } from "@/components/account/AccountButton";
import { LogoMark } from "@/components/shared/Logo";
import type { DictKey } from "@/lib/i18n/dictionary";

const NAV: { href: string; label: string; key?: DictKey }[] = [
  { href: "/lab", label: "", key: "nav.lab" },
  { href: "/cheatsheet", label: "Cheatsheet" },
  { href: "/docs", label: "Docs" },
];

export function Header() {
  const { t } = useI18n();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

  const onLab = pathname === "/lab";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      menuButton.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="header">
      <div className="container bar">

        <Link href="/" aria-label="Regex Lab" className="wordmark">
          <LogoMark size={20} className="wordmark-mark" />
          <span className="wordmark-text">Regex Lab</span>
        </Link>

        <nav
          className={open ? "nav open" : "nav"}
          id="primary-nav"
          aria-label={t("nav.label")}
        >
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}

                onClick={() => setOpen(false)}
              >
                {item.label || t(item.key!)}
              </Link>
            );
          })}
        </nav>

        <div className="actions">
          <div className="actions-group">
            <LanguageToggle />
            <ThemeToggle />
          </div>

          <div className="actions-group">

            {!onLab ? (
              <Link href="/lab" className="btn btn-primary cta-header">
                {t("cta.open")}
              </Link>
            ) : null}

          </div>

          <button
            ref={menuButton}
            type="button"
            className="icon-btn menu-btn"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="primary-nav"
            aria-label={t("nav.menu")}
          >
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
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>

          <div className="actions-group actions-identity">
            <AccountButton />
          </div>
        </div>
      </div>
    </header>
  );
}
