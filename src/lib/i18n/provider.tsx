"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { Lang } from "@/lib/regex/core";
import { DICTIONARY, translate, type DictKey } from "./dictionary";
import { LANG_KEY, LANG_COOKIE, writeLocal } from "./storage";

export interface PageMeta {
  title?: DictKey;
  description?: DictKey;
}

interface I18nValue {
  lang: Lang;
  t: (key: DictKey) => string;
  setLang: (lang: Lang) => void;

  setPageMeta: (meta: PageMeta) => void;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  children,
  defaultLang,
}: {
  children: ReactNode;

  defaultLang: Lang;
}) {
  const [choice, setChoice] = useState<Lang | null>(null);
  const [pageMeta, setPageMeta] = useState<PageMeta>({});

  const lang: Lang = choice ?? defaultLang;

  const setLang = useCallback((next: Lang) => {
    setChoice(next);
    writeLocal(LANG_KEY, next);

    const secure = window.location.protocol === "https:" ? "; secure" : "";
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax${secure}`;
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;

    const section = pageMeta.title ? DICTIONARY[pageMeta.title]?.[lang] : undefined;
    if (section) document.title = `${section} | Regex Lab`;

    const description = pageMeta.description
      ? DICTIONARY[pageMeta.description]?.[lang]
      : undefined;
    const tag = document.querySelector('meta[name="description"]');
    if (description && tag) tag.setAttribute("content", description);
  }, [lang, pageMeta.title, pageMeta.description]);

  const value = useMemo<I18nValue>(
    () => ({ lang, setLang, setPageMeta, t: (key: DictKey) => translate(lang, key) }),
    [lang, setLang]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n debe usarse dentro de <I18nProvider>");
  return ctx;
}

export function useT(): (key: DictKey) => string {
  return useI18n().t;
}
