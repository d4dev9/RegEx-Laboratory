"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { useI18n } from "@/lib/i18n/provider";
import { useHydrated } from "@/hooks/useHydrated";
import { useAuthAdapter } from "@/components/account/AuthProvider";
import { AccountDialog } from "@/components/account/AccountDialog";
import { SignOutDialog } from "@/components/account/SignOutDialog";
import { ProviderBadge, UserAvatar } from "@/components/account/ProviderBadge";
import { Portal } from "@/components/shared/Portal";

export function AccountButton() {
  const { t } = useI18n();
  const { user, isLoaded, openAuth } = useAuthAdapter();
  const [accountOpen, setAccountOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const hydrated = useHydrated();

  const pathname = usePathname();
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const menuOpen = openedOn === pathname;

  const close = (returnFocus = false) => {
    setOpenedOn(null);
    if (returnFocus) trigger.current?.focus();
  };

  useEffect(() => {
    if (!menuOpen) return;

    const onPointer = (e: MouseEvent) => {
      if (root.current?.contains(e.target as Node)) return;
      close();
    };

    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      close(true);
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  if (!isLoaded || !hydrated) {

    return <span className="acct-avatar acct-avatar-ph" aria-hidden="true" />;
  }

  if (!user) {
    return (
      <button
        type="button"
        id="account-btn"
        className="btn acct-signin"
        onClick={openAuth}
        aria-label={t("au.signin")}
      >
        <UserGlyph />
      </button>
    );
  }

  return (
    <div className="acct" ref={root}>
      <button
        ref={trigger}
        type="button"
        id="account-btn"
        className="acct-avatar-btn acct-identity"
        onClick={() => setOpenedOn(menuOpen ? null : pathname)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        <UserAvatar user={user} />
        <span className="acct-alias">{user.alias}</span>
      </button>

      {menuOpen ? (
        <div className="acct-menu" role="menu" aria-label={t("au.account")}>
          <div className="acct-menu-head">
            <p className="acct-menu-name">{user.alias}</p>
            {user.email ? (
              <p className="acct-menu-email" title={user.email}>
                {user.email}
              </p>
            ) : null}
            {user.provider ? <ProviderBadge provider={user.provider} /> : null}
          </div>

          <ul className="acct-menu-list">
            <Item
              id="ac-settings"
              label={t("acct.settings")}
              icon="settings"
              onClick={() => {
                close();

                setAccountOpen(true);
              }}
            />
          </ul>

          <div className="acct-menu-sep" role="separator" />

          <Item
            id="ac-signout"
            label={t("acct.signout")}
            icon="logout"
            onClick={() => {
              close();

              setSignOutOpen(true);
            }}
          />
        </div>
      ) : null}

      <Portal>
        <AccountDialog open={accountOpen} onOpenChange={setAccountOpen} />

        <SignOutDialog open={signOutOpen} onOpenChange={setSignOutOpen} />
      </Portal>

    </div>
  );
}

function Item({
  id,
  label,
  icon,
  onClick,
}: {
  id: string;
  label: string;
  icon: "settings" | "logout";
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        role="menuitem"
        className="acct-menu-item"
        id={id}
        onClick={onClick}
      >
        <MenuGlyph icon={icon} />
        {label}
      </button>
    </li>
  );
}

function MenuGlyph({ icon }: { icon: "settings" | "logout" }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (icon === "settings") {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 8l-4 4 4 4M6 12h9" />
    </svg>
  );
}

function UserGlyph() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  );
}