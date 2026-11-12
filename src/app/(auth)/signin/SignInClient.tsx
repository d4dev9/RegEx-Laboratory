"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { useI18n } from "@/lib/i18n/provider";
import { useAuthAdapter } from "@/components/account/AuthProvider";
import { AuthDialog } from "@/components/account/AuthDialog";
import { takeReturnPath } from "@/lib/auth/client";
import { PageChrome } from "@/components/shared/PageChrome";

function subscribeToNothing(): () => void {
  return () => {};
}

function readDestination(): string {
  const explicit = new URLSearchParams(window.location.search).get("next");

  if (
    explicit &&
    explicit.startsWith("/") &&
    !explicit.startsWith("//") &&
    !explicit.includes("\\") &&
    !/[\u0000-\u001f\u007f]/.test(explicit)
  ) {
    return explicit;
  }

  return takeReturnPath() ?? "/lab";
}

export function SignInClient() {
  const { t } = useI18n();
  const { user, isLoaded } = useAuthAdapter();

  const destination = useSyncExternalStore(
    subscribeToNothing,
    readDestination,
    () => "/lab"
  );

  const [exchanging, setExchanging] = useState(
    () => typeof window !== "undefined" && window.location.hash.includes("code=")
  );

  useEffect(() => {
    if (!exchanging) return;

    const settle = () => setExchanging(false);

    const observer = new MutationObserver(settle);
    const root = document.body;
    if (root) observer.observe(root, { childList: true, subtree: true });

    const timer = window.setTimeout(settle, 8000);

    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [exchanging]);

  if (isLoaded && user) {
    return (
      <PageChrome meta={{ title: "au.meta.title", description: "au.meta.desc" }}>
        <div className="container page">
          <div className="signin-alone">
            <p className="muted">
              {t("au.signed.in.as")} <strong>{user.alias}</strong>
            </p>
            <a className="btn btn-primary" href={destination}>
              {t("au.continue")}
            </a>
          </div>
        </div>
      </PageChrome>
    );
  }

  if (exchanging) {
    return (
      <PageChrome meta={{ title: "au.meta.title", description: "au.meta.desc" }}>
        <div className="container page">
          <div className="signin-alone">
            <p className="muted" role="status" aria-live="polite">
              {t("au.finishing")}
            </p>
          </div>
        </div>
      </PageChrome>
    );
  }

  return (
    <PageChrome meta={{ title: "au.meta.title", description: "au.meta.desc" }}>
      <div className="container page">
        <div className="signin-card signin-alone-card">
          <AuthDialog
            open
            asPage
            onOpenChange={() => window.location.replace(destination)}
          />
        </div>
      </div>
    </PageChrome>
  );
}