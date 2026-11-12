"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useI18n } from "@/lib/i18n/provider";
import { useToast } from "@/components/shared/Toast";
import { useCopy } from "@/lib/i18n/shared";
import { slashForm } from "@/lib/matcher";
import { AuthOverlay } from "@/components/account/AuthDialog";
import { ProviderBadge, UserAvatar } from "@/components/account/ProviderBadge";
import { store, type StoredPattern } from "@/components/account/store";
import { useAuthAdapter } from "./AuthProvider";
import type { DictKey } from "@/lib/i18n/dictionary";

type Tab = "profile" | "patterns";

const TABS: { id: Tab; key: DictKey; icon: "user" | "bookmark" }[] = [
  { id: "profile", key: "acct.tab.profile", icon: "user" },
  { id: "patterns", key: "acct.patterns", icon: "bookmark" },
];

export function AccountDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("profile");

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setTab("profile");
  }

  return (
    <AuthOverlay
      open={open}
      onOpenChange={onOpenChange}
      title={t("acct.title")}
      titleId="acct-title"
      width="dialog dialog-account"
    >
      <div className="acct-shell">
        <nav className="acct-side" aria-label={t("acct.title")}>
          {TABS.map((item) => {
            const current = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={current ? "acct-side-item is-current" : "acct-side-item"}
                aria-current={current ? "true" : undefined}
                onClick={() => setTab(item.id)}
              >
                <TabGlyph icon={item.icon} />
                {t(item.key)}
              </button>
            );
          })}
        </nav>

        <div className="acct-panel" role="tabpanel" aria-label={t(tabLabel(tab))}>
          {tab === "profile" ? <ProfileSection /> : null}
          {tab === "patterns" ? <PatternsSection /> : null}
        </div>
      </div>
    </AuthOverlay>
  );
}

function tabLabel(tab: Tab): DictKey {
  return tab === "profile" ? "acct.tab.profile" : "acct.patterns";
}

function ProfileSection() {
  const { t, lang } = useI18n();
  const { user, signOut } = useAuthAdapter();
  const raise = useToast();

  const [armedWhile, setArmedWhile] = useState<boolean | null>(null);
  const armed = armedWhile === true;

  const [busy, setBusy] = useState(false);

  const remove = async () => {
    if (!armed) {
      setArmedWhile(true);
      return;
    }

    setBusy(true);
    try {
      await store.deleteAccount();

      await signOut();
      raise(t("acct.deleted"));
      window.location.replace("/");
    } catch {

      raise(t("acct.delete.err"));
      setArmedWhile(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="acct-section">

      <div className="acct-identity">
        <UserAvatar user={user ?? { alias: "", email: "" }} size={64} />
        <div>
          <p className="acct-identity-name">{user?.alias}</p>
          {user?.provider ? <ProviderBadge provider={user.provider} /> : null}
        </div>
      </div>

      <dl className="acct-meta">
        {user?.email ? (
          <Meta label={t("acct.email")} value={user.email} />
        ) : null}
        {user?.createdAt ? (
          <Meta
            label={t("acct.since")}
            value={formatDate(user.createdAt, lang)}
          />
        ) : null}

        {user?.lastSignInAt ? (
          <Meta
            label={t("acct.last.signin")}
            value={formatDate(user.lastSignInAt, lang)}
          />
        ) : null}
      </dl>

      <div className="danger-zone">
        {armed ? (
          <p className="hint-text" id="ac-warn" role="alert">
            {t("acct.delete.warn")}
          </p>
        ) : null}
        <button
          type="button"
          className="btn btn-block btn-danger"
          id="ac-delete"
          disabled={busy}
          onClick={() => void remove()}
        >
          {armed ? t("acct.delete.confirm") : t("acct.delete")}
        </button>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="acct-meta-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function formatDate(iso: string, lang: "es" | "en"): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat(lang === "es" ? "es-ES" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function PatternsSection() {
  const { t } = useI18n();
  const router = useRouter();
  const raise = useToast();
  const copy = useCopy();

  const [items, setItems] = useState<StoredPattern[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = await store.list();
        if (!cancelled) setItems(list);
      } catch {
        if (!cancelled) {
          raise(t("au.err.generic"));
          setItems([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [raise, t]);

  const remove = async (id: string) => {
    setBusy(true);
    try {
      await store.remove(id);
      setItems((prev) => prev?.filter((p) => p.id !== id) ?? null);
    } catch {
      raise(t("au.err.generic"));
    } finally {
      setBusy(false);
    }
  };

  if (!items) {
    return (
      <p className="muted acct-loading" role="status">
        {t("cs.none")}
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <div className="acct-empty" id="ml-empty">
        <span className="acct-empty-icon" aria-hidden="true">
          <TabGlyph icon="bookmark" />
        </span>
        <p className="acct-empty-title">{t("ml.empty.title")}</p>
        <p className="muted acct-empty-hint">{t("ml.empty.hint")}</p>
      </div>
    );
  }

  return (
    <ul className="acct-patterns" id="ml-list">
      {items.map((item) => (
        <SavedPattern
          key={item.id}
          item={item}
          busy={busy}
          loadLabel={t("ml.load")}
          publicLabel={t("ml.public")}
          privateLabel={t("ml.private")}
          deleteLabel={t("ml.delete")}
          confirmLabel={t("ml.confirm")}
          linkLabel={t("ml.link")}
          onLoad={() => router.push(`/lab#s=${item.id}`)}
          onCopyLink={() =>
            void copy(
              `${window.location.origin}/p/${item.id}`,
              t("ml.copied")
            )
          }
          onDelete={() => void remove(item.id)}
        />
      ))}
    </ul>
  );
}

function SavedPattern({
  item,
  busy,
  loadLabel,
  publicLabel,
  privateLabel,
  deleteLabel,
  confirmLabel,
  linkLabel,
  onLoad,
  onCopyLink,
  onDelete,
}: {
  item: StoredPattern;
  busy: boolean;
  loadLabel: string;
  publicLabel: string;
  privateLabel: string;
  deleteLabel: string;
  confirmLabel: string;
  linkLabel: string;
  onLoad: () => void;
  onCopyLink: () => void;
  onDelete: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <li className="acct-pattern">
      <div className="acct-pattern-head">
        <span className="acct-pattern-name">{item.name}</span>
        <span className="badge">
          {item.visibility === "public" ? publicLabel : privateLabel}
        </span>
      </div>

      <code className="acct-pattern-code" tabIndex={0}>
        {slashForm(item.pattern, item.flags)}
      </code>

      <div className="row-actions">
        <button type="button" className="btn btn-sm" onClick={onLoad}>
          {loadLabel}
        </button>

        {item.visibility === "public" ? (
          <button type="button" className="btn btn-sm" onClick={onCopyLink}>
            {linkLabel}
          </button>
        ) : null}

        <button
          type="button"
          className="btn btn-sm btn-danger"
          disabled={busy}
          onClick={() => {

            if (!confirming) {
              setConfirming(true);
              setTimeout(() => setConfirming(false), 3000);
              return;
            }
            onDelete();
          }}
        >
          {confirming ? confirmLabel : deleteLabel}
        </button>
      </div>
    </li>
  );
}

function TabGlyph({ icon }: { icon: "user" | "bookmark" }) {
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

  if (icon === "user") {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
      </svg>
    );
  }
  if (icon === "bookmark") {
    return (
      <svg {...common}>
        <path d="M6 4h12v16l-6-4-6 4z" />
      </svg>
    );
  }
  return null;
}