"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useI18n } from "@/lib/i18n/provider";
import { useCopy } from "@/lib/i18n/shared";
import { slashForm } from "@/lib/matcher";
import { Transition } from "@/components/shared/Portal";
import { AuthOverlay } from "./AuthDialog";
import { store, type StoredPattern } from "./store";

export function LibraryDialog({
  open,
  onOpenChange,
  onLoad,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  onLoad?: (pattern: StoredPattern) => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [items, setItems] = useState<StoredPattern[] | null>(null);
  const [error, setError] = useState("");
  const copy = useCopy();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      try {
        const list = await store.list();
        if (!cancelled) setItems(list);
      } catch {
        if (!cancelled) {
          setError(t("au.err.generic"));
          setItems([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, t]);

  const remove = async (id: string) => {
    try {
      await store.remove(id);
      setItems((prev) => prev?.filter((p) => p.id !== id) ?? null);
    } catch {
      setError(t("au.err.generic"));
    }
  };

  return (
    <Transition open={open}>
      {(state) => (
        <AuthOverlay
          open={open && state === "open"}
          onOpenChange={onOpenChange}
          title={t("ml.title")}
          titleId="ml-title"
          narrow={false}
        >
          {error ? (
            <p className="error" role="alert">
              {error}
            </p>
          ) : null}

          {!items && (
            <p className="label" role="status">
              {t("cs.none")}
            </p>
          )}

          {items && items.length === 0 && (
            <p className="muted" id="ml-empty">
              {t("ml.empty")}
            </p>
          )}

          {items && items.length > 0 && (
            <ul className="ml-list" id="ml-list">
              {items.map((item) => (
                <PatternRow
                  key={item.id}
                  item={item}
                  publicLabel={t("ml.public")}
                  privateLabel={t("ml.private")}
                  onLoadLabel={t("ml.load")}
                  onLinkLabel={t("ml.link")}
                  onDeleteLabel={t("ml.delete")}
                  confirmLabel={t("ml.confirm")}
                  onLoad={() => {
                    onOpenChange(false);
                    if (onLoad) onLoad(item);
                    else router.push(`/lab#s=${item.id}`);
                  }}
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
          )}
        </AuthOverlay>
      )}
    </Transition>
  );
}

function PatternRow({
  item,
  publicLabel,
  privateLabel,
  onLoadLabel,
  onLinkLabel,
  onDeleteLabel,
  confirmLabel,
  onLoad,
  onCopyLink,
  onDelete,
}: {
  item: StoredPattern;
  publicLabel: string;
  privateLabel: string;
  onLoadLabel: string;
  onLinkLabel: string;
  onDeleteLabel: string;
  confirmLabel: string;
  onLoad: () => void;
  onCopyLink: () => void;
  onDelete: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <li className="ml-item">
      <div className="ml-head">
        <h3>{item.name}</h3>
        <span className="badge">
          {item.visibility === "public" ? publicLabel : privateLabel}
        </span>
      </div>

      <code className="ml-code" tabIndex={0}>
        {slashForm(item.pattern, item.flags)}
      </code>

      {item.tags.length > 0 && (
        <ul className="tags">
          {item.tags.map((tag) => (
            <li key={tag} className="badge">
              {tag}
            </li>
          ))}
        </ul>
      )}

      <div className="row-actions">
        <button type="button" className="btn btn-sm" onClick={onLoad}>
          {onLoadLabel}
        </button>

        {item.visibility === "public" && (
          <button type="button" className="btn btn-sm" onClick={onCopyLink}>
            {onLinkLabel}
          </button>
        )}

        <button
          type="button"
          className="btn btn-sm btn-danger"
          onClick={() => {

            if (!confirming) {
              setConfirming(true);
              setTimeout(() => setConfirming(false), 3000);
              return;
            }
            onDelete();
          }}
        >
          {confirming ? confirmLabel : onDeleteLabel}
        </button>
      </div>
    </li>
  );
}
