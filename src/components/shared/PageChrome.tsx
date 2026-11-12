"use client";

import { useEffect, type ReactNode } from "react";

import { Header } from "@/components/shared/Header";
import { Footer } from "@/components/shared/Footer";
import { useI18n } from "@/lib/i18n/provider";
import type { DictKey } from "@/lib/i18n/dictionary";

export function PageChrome({
  children,
  meta,
}: {
  children: ReactNode;
  meta: { title: DictKey; description: DictKey };
}) {
  const { t, setPageMeta } = useI18n();

  useEffect(() => {
    setPageMeta(meta);
  }, [meta, setPageMeta]);

  return (
    <>
      <a className="skip" href="#main">
        {t("skip")}
      </a>
      <Header />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
