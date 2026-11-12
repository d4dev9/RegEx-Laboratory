"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { AuthDialog } from "./AuthDialog";
import { Transition } from "@/components/shared/Portal";
import { endSession, fetchSession, finishOAuth } from "@/lib/auth/client";
import type { AuthUser } from "@/lib/auth/supabase";

export type RlUser = AuthUser;

interface AuthValue {
  user: RlUser | null;

  isLoaded: boolean;
  requireAuth: () => Promise<RlUser>;
  signOut: () => Promise<void>;
  onChange: (fn: (user: RlUser | null) => void) => () => void;

  openAuth: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<RlUser | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const [requested, setRequested] = useState(false);

  const [openCount, setOpenCount] = useState(0);

  const pending = useRef<{ resolve: (u: RlUser) => void; reject: () => void } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchSession().then((found) => {
      if (cancelled) return;
      setUser(found);
      setIsLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const exchanged = await finishOAuth();

      if (cancelled) return;

      const found = await fetchSession();
      if (cancelled) return;

      setUser(found);
      setIsLoaded(true);

      if (exchanged) {

        window.history.replaceState(null, "", window.location.pathname);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const onHashChange = () => {
      if (cancelled) return;

      if (!window.location.hash.includes("code=")) return;

      void finishOAuth().then((exchanged) => {
        if (cancelled || !exchanged) return;
        void fetchSession().then((found) => {
          if (cancelled) return;
          setUser(found);
          setIsLoaded(true);
        });
      });
    };

    window.addEventListener("hashchange", onHashChange);

    onHashChange();

    return () => {
      cancelled = true;
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);

  const listeners = useRef(new Set<(u: RlUser | null) => void>());
  useEffect(() => {
    for (const fn of listeners.current) fn(user);
  }, [user]);

  const onChange = useCallback((fn: (u: RlUser | null) => void) => {
    listeners.current.add(fn);
    return () => {
      listeners.current.delete(fn);
    };
  }, []);

  const openAuth = useCallback(() => {
    setOpenCount((n) => n + 1);
    setRequested(true);
  }, []);

  const requireAuth = useCallback(() => {
    if (user) return Promise.resolve(user);
    setOpenCount((n) => n + 1);
    setRequested(true);
    return new Promise<RlUser>((resolve, reject) => {
      pending.current = { resolve, reject };
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const p = pending.current;
    if (p) {
      pending.current = null;
      p.resolve(user);
    }
  }, [user]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setRequested(open);
      if (!open && !user) {
        pending.current?.reject();
        pending.current = null;
      }
    },
    [user]
  );

  const dialogOpen = requested && !user;

  const value = useMemo<AuthValue>(
    () => ({
      user,
      isLoaded,
      requireAuth,
      signOut: async () => {
        await endSession();
        setUser(null);
      },
      onChange,
      openAuth,
    }),
    [user, isLoaded, requireAuth, onChange, openAuth]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}

      <Transition open={dialogOpen}>
        {(state) => (
          <AuthDialog
            key={`${openCount}-${state}`}
            open={dialogOpen}
            onOpenChange={handleOpenChange}
          />
        )}
      </Transition>
    </AuthContext.Provider>
  );
}

export function useAuthAdapter(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthAdapter debe usarse dentro de <AuthProvider>");
  return ctx;
}
