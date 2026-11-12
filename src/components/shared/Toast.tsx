"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useI18n } from "@/lib/i18n/provider";
import { useHydrated } from "@/hooks/useHydrated";

const TTL = 2600;

const MAX_VISIBLE = 3;

interface Toast {
  id: number;
  message: string;
}

const RaiseContext = createContext<(message: string) => void>(() => {});

export function useToast() {
  return useContext(RaiseContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((entry) => entry.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const clearAll = useCallback(() => {
    for (const timer of timers.current.values()) clearTimeout(timer);
    timers.current.clear();
    setToasts([]);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") clearAll();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [clearAll]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) clearTimeout(timer);
      pending.clear();
    };
  }, []);

  const raise = useCallback((message: string) => {
    if (!message) return;
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, message }].slice(-MAX_VISIBLE));
    timers.current.set(
      id,
      setTimeout(() => {
        timers.current.delete(id);
        setToasts((prev) => prev.filter((entry) => entry.id !== id));
      }, TTL)
    );
  }, []);

  const hydrated = useHydrated();

  return (
    <RaiseContext.Provider value={raise}>
      {children}

      <div className="toasts" role="status" aria-live="polite">
        {hydrated &&
          toasts.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className="toast"
              onClick={() => dismiss(entry.id)}
            >
              <CheckIcon />
              <span className="toast-text">{entry.message}</span>
              <span className="sr-only">{t("toast.dismiss")}</span>
            </button>
          ))}
      </div>
    </RaiseContext.Provider>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="toast-icon"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
