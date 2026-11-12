"use client";

import { useState } from "react";

import { useI18n } from "@/lib/i18n/provider";
import { useCopy } from "@/lib/i18n/shared";
import { slashForm } from "@/lib/matcher";
import {
  store,
  StoreError,
  type StoredPattern,
  type Visibility,
} from "@/components/account/store";
import { AuthOverlay } from "@/components/account/AuthDialog";

export function SaveDialog({
  onOpenChange,
  pattern,
  flags,
  text,
  current,
  onSaved,
}: {
  onOpenChange: (open: boolean) => void;
  pattern: string;
  flags: string;

  text: string;

  current: StoredPattern | null;
  onSaved: (saved: StoredPattern) => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(current?.name ?? "");
  const [tags, setTags] = useState(current?.tags.join(", ") ?? "");
  const [visibility, setVisibility] = useState<Visibility>(
    current?.visibility ?? "private"
  );

  const [publishText, setPublishText] = useState(
    current?.visibility === "public" ? Boolean(current.sharedText) : false
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<StoredPattern | null>(null);
  const copy = useCopy();

  const close = () => onOpenChange(false);

  const submit = async (asNew: boolean) => {
    setError("");

    if (!name.trim()) {
      setError(t("sv.err.name"));
      return;
    }

    const parsed = tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .filter((tag, i, all) => all.indexOf(tag) === i);

    if (parsed.length > 5 || parsed.some((tag) => tag.length > 24)) {
      setError(t("sv.err.tags"));
      return;
    }

    setBusy(true);
    try {
      const record = await store.save({
        id: asNew ? undefined : current?.id,
        name: name.trim(),
        pattern,
        flags,
        tags: parsed,
        visibility,
        sharedText:
          visibility === "public" && publishText ? text : null,
      });
      setSaved(record);
      onSaved(record);
    } catch (e) {

      setError(
        e instanceof StoreError && e.code === "quota"
          ? t("sv.err.quota")
          : t("sv.err.save")
      );
    } finally {
      setBusy(false);
    }
  };

  const publicLink =
    saved && typeof window !== "undefined"
      ? `${window.location.origin}/p/${saved.id}`
      : "";

  const shortLink =
    saved && typeof window !== "undefined"
      ? `${window.location.origin}/lab#s=${saved.id}`
      : "";

  return (
    <AuthOverlay
      open
      onOpenChange={(next) => {
        if (!next) close();
      }}
      title={current ? t("sv.title.edit") : t("sv.title")}
      titleId="save-title"
    >
      <div>
        {!saved ? (
          <form
            id="save-form"
            onSubmit={(e) => {
              e.preventDefault();
              void submit(false);
            }}
          >
            <pre className="code">
              <code>{slashForm(pattern, flags)}</code>
            </pre>

            <div className="field">
              <label className="label" htmlFor="sv-name">
                {t("sv.name")}
              </label>
              <input
                id="sv-name"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                autoComplete="off"
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="sv-tags">
                {t("sv.tags")}
              </label>
              <input
                id="sv-tags"
                className="input"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                autoComplete="off"
                aria-describedby="sv-tags-hint"
              />
              <p className="hint-text" id="sv-tags-hint">
                {t("sv.tags.hint")}
              </p>
            </div>

            <fieldset>
              <legend className="label">{t("sv.vis")}</legend>
              <VisibilityOption
                value="private"
                checked={visibility === "private"}
                onChange={setVisibility}
                title={t("sv.private")}
                description={t("sv.private.d")}
              />
              <VisibilityOption
                value="public"
                checked={visibility === "public"}
                onChange={setVisibility}
                title={t("sv.public")}
                description={t("sv.public.d")}
              />
            </fieldset>

            {visibility === "public" && (
              <div className="field">
                <label className="label" htmlFor="sv-publish-text">
                  {t("sv.text.label")}
                </label>
                <label className="radio" htmlFor="sv-publish-text">
                  <input
                    id="sv-publish-text"
                    type="checkbox"
                    checked={publishText}
                    onChange={(e) => setPublishText(e.target.checked)}
                  />
                  <span>
                    <strong>{t("sv.text.share")}</strong>
                    <span className="hint-text">{t("sv.text.hint")}</span>
                  </span>
                </label>
              </div>
            )}

            <p className="error" id="sv-error" role="alert">
              {error}
            </p>

            <div className="row-actions">
              <button
                type="submit"
                className="btn btn-primary"
                id="sv-submit"
                disabled={busy}
              >
                {current ? t("sv.update") : t("sv.submit")}
              </button>
              {current && (
                <button
                  type="button"
                  className="btn"
                  id="sv-new"
                  disabled={busy}
                  onClick={() => void submit(true)}
                >
                  {t("sv.new")}
                </button>
              )}
            </div>
          </form>
        ) : (
          <div id="sv-done">
            <p className="acct-alias">{t("sv.done")}</p>

            {saved.visibility === "public" && (
              <div className="field" style={{ marginTop: "var(--space-6)" }}>
                <label className="label" htmlFor="sv-link">
                  {t("sv.link")}
                </label>
                <input
                  id="sv-link"
                  className="input"
                  readOnly
                  value={publicLink}
                />
                <div className="row-actions" style={{ marginTop: "var(--space-2)" }}>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => void copy(publicLink, t("sv.copied"))}
                  >
                    {t("sv.copy")}
                  </button>
                </div>

                <label
                  className="label"
                  htmlFor="sv-short-link"
                  style={{ marginTop: "var(--space-6)" }}
                >
                  {t("sv.short.link")}
                </label>
                <input
                  id="sv-short-link"
                  className="input"
                  readOnly
                  value={shortLink}
                />
                <p className="hint-text">{t("sv.short.hint")}</p>
                <div className="row-actions" style={{ marginTop: "var(--space-2)" }}>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => void copy(shortLink, t("sv.copied"))}
                  >
                    {t("sv.copy.short")}
                  </button>
                </div>
              </div>
            )}

            <div style={{ marginTop: "var(--space-6)" }}>
              <button type="button" className="btn btn-primary" onClick={close}>
                {t("close")}
              </button>
            </div>
          </div>
        )}
      </div>
    </AuthOverlay>
  );
}

function VisibilityOption({
  value,
  checked,
  onChange,
  title,
  description,
}: {
  value: Visibility;
  checked: boolean;
  onChange: (v: Visibility) => void;
  title: string;
  description: string;
}) {
  return (
    <label className="radio">
      <input
        type="radio"
        name="sv-vis"
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
      />
      <span>
        <strong>{title}</strong>
        <span className="hint-text">{description}</span>
      </span>
    </label>
  );
}
