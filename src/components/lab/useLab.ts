"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";

import { explain, type ExplainedToken } from "@/lib/regex/core";
import { useHydrated } from "@/hooks/useHydrated";
import { collectMatches, type RawMatch } from "@/lib/matcher";
import { readHash, type LabHash } from "@/lib/share";
import { DEFAULT_FLAGS, type Flag, type PaletteItem } from "./LabPanels";
import type { StoredPattern } from "@/components/account/store";

const DRAFT_KEY = "rl-draft";

interface Draft {
  p: string;
  f: string;
  t: string;
}

export type Tab = "explain" | "matches";

export { readHash, type LabHash } from "@/lib/share";

function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as Draft).p === "string" &&
      typeof (parsed as Draft).f === "string" &&
      typeof (parsed as Draft).t === "string"
    ) {
      return parsed as Draft;
    }
    return null;
  } catch {
    return null;
  }
}

export interface LabState {
  pattern: string;
  flags: string;
  text: string;
  tab: Tab;
  current: StoredPattern | null;
  dirty: boolean;
  matches: RawMatch[];
  truncated: boolean;

  error: "risky" | "invalid" | null;

  errorDetail?: string;

  tokens: ExplainedToken[];

  inputRef: RefObject<HTMLInputElement | null>;
  setPattern: (value: string) => void;
  setText: (value: string) => void;
  toggleFlag: (flag: Flag) => void;
  setFlags: (value: string) => void;
  setTab: (tab: Tab) => void;
  load: (record: StoredPattern) => void;

  restore: (state: { pattern: string; flags: string; text?: string }) => void;
  reset: () => void;
  insert: (item: PaletteItem) => void;

  rememberCaret: () => void;
}

export const DEFAULT_PATTERN = "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}";

export const DEFAULT_TEXT =
  "Contacta con nosotros en soporte@ejemplo.com\no ventas@empresa.org para más info. Sin datos: nope@localhost";

export function useLab(initialHash?: LabHash): LabState {
  const hydrated = useHydrated();

  const [seeded, setSeeded] = useState(false);

  const hash = initialHash ?? (hydrated ? readHash(window.location.hash) : {});
  const [pattern, setPatternState] = useState(DEFAULT_PATTERN);
  const [flags, setFlagsState] = useState(DEFAULT_FLAGS);
  const [text, setTextState] = useState(DEFAULT_TEXT);
  const [tab, setTab] = useState<Tab>("explain");
  const [current, setCurrent] = useState<StoredPattern | null>(null);
  const [dirty, setDirty] = useState(false);

  if (hydrated && !seeded) {
    setSeeded(true);
    const draft = loadDraft();

    const fromHash = hash.p !== undefined;
    const savedId = hash.s !== undefined;

    if (!savedId) {
      setPatternState(fromHash ? hash.p! : draft ? draft.p : DEFAULT_PATTERN);
      if (hash.f !== undefined) setFlagsState(hash.f);
      else if (!fromHash && draft) setFlagsState(draft.f);
      if (hash.t !== undefined) setTextState(hash.t);
      else if (!fromHash && draft) setTextState(draft.t);
    }
  }

  const result = useMemo(() => collectMatches(pattern, flags, text), [pattern, flags, text]);

  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (draftTimer.current) clearTimeout(draftTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!dirty) return;
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ p: pattern, f: flags, t: text }));
      } catch {

      }
    }, 300);
  }, [pattern, flags, text, dirty]);

  const setPattern = useCallback((value: string) => {
    setPatternState(value);
    setDirty(true);
  }, []);

  const setText = useCallback((value: string) => {
    setTextState(value);
    setDirty(true);
  }, []);

  const setFlags = useCallback((value: string) => {
    setFlagsState(value);
    setDirty(true);
  }, []);

  const toggleFlag = useCallback((flag: Flag) => {
    setFlagsState((prev) =>
      prev.includes(flag) ? prev.replace(flag, "") : prev + flag
    );
    setDirty(true);
  }, []);

  const load = useCallback(
    (record: StoredPattern) => {
      setPatternState(record.pattern);
      setFlagsState(record.flags);
      setCurrent(record);
      setDirty(true);
    },
    []
  );

  const restore = useCallback(
    (state: { pattern: string; flags: string; text?: string }) => {
      setPatternState(state.pattern);
      setFlagsState(state.flags);
      if (state.text !== undefined) setTextState(state.text);
      setCurrent(null);
      setDirty(true);
    },
    []
  );

  const reset = useCallback(() => {
    setCurrent(null);
  }, []);

  const inputRef = useRef<HTMLInputElement>(null);

  const caretRef = useRef<number | null>(null);

  const inserting = useRef(false);

  const rememberCaret = useCallback(() => {
    if (inserting.current) return;
    const el = inputRef.current;
    caretRef.current =
      el && el.selectionStart !== null ? el.selectionStart : caretRef.current;
  }, []);

  const insert = useCallback((item: PaletteItem) => {

    const el = inputRef.current;
    const value = el?.value ?? "";

    const live = el?.selectionStart ?? null;
    const start = live ?? caretRef.current ?? value.length;
    const end = el?.selectionEnd ?? start;

    let inserted: string;
    let caret: number;

    if (item.w) {
      const [open, close] = item.w;
      const selected = value.slice(start, end);
      inserted = open + selected + close;

      caret = selected ? start + inserted.length : start + open.length;
    } else {
      inserted = item.i ?? item.l;
      caret = start + inserted.length;
    }

    setPatternState(value.slice(0, start) + inserted + value.slice(end));
    setDirty(true);
    caretRef.current = caret;

    if (el) {

      inserting.current = true;
      el.focus();
      requestAnimationFrame(() => {
        el.setSelectionRange(caret, caret);

        el.focus();

        inserting.current = false;
      });
    }
  }, []);

  const tokens = useMemo(() => explain(pattern), [pattern]);

  return {
    pattern,
    flags,
    text,
    tab,
    current,
    dirty,
    matches: result.ok ? result.matches : [],
    truncated: result.ok ? result.truncated : false,
    error: result.ok ? null : result.reason,
    errorDetail: result.ok ? undefined : result.message,
    tokens,
    inputRef,
    setPattern,
    setText,
    toggleFlag,
    setFlags,
    setTab,
    load,
    restore,
    reset,
    insert,
    rememberCaret,
  };
}
