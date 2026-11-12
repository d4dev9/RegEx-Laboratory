"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { useHydrated } from "@/hooks/useHydrated";

export function Portal({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  if (!hydrated) return null;
  return createPortal(children, document.body);
}

export function Transition({
  open,
  linger = 220,
  children,
}: {
  open: boolean;

  linger?: number;
  children: (state: "open" | "closed") => ReactNode;
}) {
  const hydrated = useHydrated();

  const [visible, setVisible] = useState(open);
  if (open && !visible) setVisible(true);

  useEffect(() => {
    if (open || !visible) return;
    const timer = setTimeout(() => setVisible(false), linger);
    return () => clearTimeout(timer);
  }, [open, visible, linger]);

  if (!hydrated || !visible) return null;
  return <>{children(open ? "open" : "closed")}</>;
}
