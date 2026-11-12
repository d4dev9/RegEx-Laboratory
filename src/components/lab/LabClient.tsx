"use client";

import { useCallback, useEffect, useState } from "react";

import { useI18n } from "@/lib/i18n/provider";
import { CopyGlyph, useCopy } from "@/lib/i18n/shared";
import { slashForm } from "@/lib/matcher";
import { readHash, shareHref, shortHref } from "@/lib/share";
import { useAuthAdapter } from "@/components/account/AuthProvider";
import { LibraryDialog } from "@/components/account/LibraryDialog";
import { store, type StoredPattern } from "@/components/account/store";
import { PageChrome } from "@/components/shared/PageChrome";
import { useToast } from "@/components/shared/Toast";
import { ExportDialog, FlagToggles, TokenPalette } from "./LabPanels";
import { SaveDialog } from "./SaveDialog";
import { useLab } from "./useLab";
import type { RawMatch } from "@/lib/matcher";

export function LabClient() {
  const { t, lang } = useI18n();
  const { requireAuth, user, isLoaded } = useAuthAdapter();
  const copy = useCopy();

  const lab = useLab();

  const {
    pattern,
    flags,
    text,
    tab,
    current,
    matches,
    error,
    errorDetail,
    tokens,
    inputRef,
    setPattern,
    setText,
    toggleFlag,
    setTab,
    insert,
    load,
    restore,
    rememberCaret,
  } = lab;

  const [saveOpen, setSaveOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const countLabel = useCallback((): string => {
    if (error === "risky") return t("ed.risky");
    if (error === "invalid") return t("ed.invalid");
    return matches.length === 1 ? t("out.one") : `${matches.length}${t("out.many")}`;
  }, [error, matches.length, t]);

  const raise = useToast();

  const publishedMatch =
    current &&
    current.visibility === "public" &&
    current.pattern === pattern &&
    current.flags === flags &&
    (current.sharedText ?? "") === text
      ? current
      : null;

  const run = useCallback(() => {
    raise(countLabel());
  }, [countLabel, raise]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        run();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [run]);

  useEffect(() => {
    const id = readHash(window.location.hash).s;
    if (!id || !isLoaded) return;

    let cancelled = false;

    void (async () => {
      try {
        const published = await store.getPublic(id);
        if (cancelled) return;

        if (published) {

          if (user) {
            const own = await store.get(id);
            if (cancelled) return;
            if (own) {
              load(own);
              raise(t("toast.loaded"));
              return;
            }
          }
          restore({
            pattern: published.pattern,
            flags: published.flags,
            text: published.sharedText ?? undefined,
          });
          raise(t("toast.loaded"));
          return;
        }

        const record = await requireAuth().then(() => store.get(id));
        if (cancelled) return;
        if (!record) {
          raise(t("toast.notfound"));
          return;
        }
        load(record);
        raise(t("toast.loaded"));
      } catch {
        // The user dismissed the sign-in dialog; nothing to report.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, user, requireAuth, load, restore, raise, t]);

  const handleSave = () => {
    if (pattern === "") {
      raise(t("sv.err.empty"));
      return;
    }

    void requireAuth()
      .then(() => setSaveOpen(true))
      .catch(() => {});
  };

  const handleMyPatterns = () => {
    void requireAuth()
      .then(() => setLibraryOpen(true))
      .catch(() => {});
  };

  const handleLoad = (record: StoredPattern) => {
    load(record);
    raise(t("toast.loaded"));
  };

  return (
    <PageChrome meta={{ title: "lab.meta.title", description: "meta.desc" }}>
      <main id="lab-main" className="lab">
        <div className="container wide">
          <div className="lab-bar">
            <div>
              <h1>{t("lab.h1")}</h1>
            </div>

            <div
              className="toolbar"
              role="toolbar"
              aria-label={t("tool.label")}
            >
              <button type="button" className="btn btn-primary" onClick={run}>
                {t("tool.run")} <kbd>Ctrl+Enter</kbd>
              </button>
              <button
                type="button"
                className="btn"
                id="copy"
                onClick={() => void copy(slashForm(pattern, flags), t("tool.copied"))}
              >
                <CopyGlyph />
              </button>
              <button
                type="button"
                className="btn"
                id="export"
                onClick={() => setExportOpen(true)}
              >
                {t("tool.export")}
              </button>
              <button
                type="button"
                className="btn"
                id="share"
                onClick={() =>

                  void copy(
                    publishedMatch
                      ? shortHref(window.location.href, publishedMatch.id)
                      : shareHref(window.location.href, pattern, flags, text),
                    t("tool.shared")
                  )
                }
              >
                {t("tool.share")}
              </button>
              <button type="button" className="btn" id="save" onClick={handleSave}>
                {t("tool.save")}
              </button>
              <button
                type="button"
                className="btn"
                id="mylib"
                onClick={handleMyPatterns}
              >
                {t("tool.mylib")}
              </button>
            </div>
          </div>

          <div className="lab-grid">
            <TokenPalette onInsert={insert} />

            <section className="panel editor" aria-label={t("ed.label")}>
              <div className="panel-body">
                <label className="label field-label" htmlFor="pattern">
                  {t("ed.regex")}
                </label>

                <div
                  className="pattern-field"
                  id="pattern-field"
                  data-invalid={error ? "true" : undefined}
                >
                  <span aria-hidden="true">/</span>
                  <input
                    id="pattern"
                    ref={inputRef}
                    value={pattern}
                    onChange={(e) => setPattern(e.target.value)}

                    onSelect={rememberCaret}
                    onBlur={rememberCaret}
                    onKeyUp={rememberCaret}
                    spellCheck={false}
                    autoComplete="off"
                    autoCapitalize="off"
                    aria-describedby="error"
                  />
                  <span aria-hidden="true" id="flags-label">
                    /{flags}
                  </span>
                </div>

                <p className="error" id="error" role="alert">
                  {error === "risky"
                    ? t("ed.risky")
                    : error === "invalid"
                      ?
                        `${t("ed.invalid")}: ${errorDetail ?? ""}`
                      : ""}
                </p>

                <p className="label field-label flags-title" id="flags-title">
                  {t("ed.flags")}
                </p>
                <FlagToggles flags={flags} onToggle={toggleFlag} />
              </div>

              <div className="panel-body bordered">
                <label className="label field-label" htmlFor="text">
                  {t("ed.text")}
                </label>
                <textarea
                  id="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={7}
                  spellCheck={false}
                />
              </div>

              <div className="panel-body bordered">
                <div className="row-head">
                  <p className="label field-label">{t("ed.result")}</p>
                  <span className="badge" id="count" aria-live="polite">
                    {countLabel()}
                  </span>
                </div>
                <ResultView text={text} matches={matches} />
              </div>
            </section>

            <section className="panel output" aria-label={t("out.label")}>

              <div
                className="tabs"
                role="tablist"
                aria-label={t("out.label")}
                onKeyDown={(e) => {
                  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
                  e.preventDefault();
                  setTab(tab === "explain" ? "matches" : "explain");
                }}
              >
                <button
                  type="button"
                  role="tab"
                  id="tab-explain"
                  className="tab"
                  aria-controls="panel-explain"
                  aria-selected={tab === "explain"}
                  tabIndex={tab === "explain" ? 0 : -1}
                  onClick={() => setTab("explain")}
                >
                  {t("out.explain")}
                </button>
                <button
                  type="button"
                  role="tab"
                  id="tab-matches"
                  className="tab"
                  aria-controls="panel-matches"
                  aria-selected={tab === "matches"}
                  tabIndex={tab === "matches" ? 0 : -1}
                  onClick={() => setTab("matches")}
                >
                  {t("out.matches")}
                </button>
              </div>

              <div
                className="panel-body scroll"
                id="panel-explain"
                role="tabpanel"
                aria-labelledby="tab-explain"
                hidden={tab !== "explain"}
              >
                {pattern === "" ? (
                  <p className="empty">{t("ed.empty")}</p>
                ) : (
                  <ul className="explain">
                    {tokens.map((token, i) => (
                      <li key={i} style={{ "--depth": token.depth } as React.CSSProperties}>
                        <code>{token.t}</code>
                        <span>{token[lang]}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div
                className="panel-body scroll"
                id="panel-matches"
                role="tabpanel"
                aria-labelledby="tab-matches"
                hidden={tab !== "matches"}
              >
                <MatchesView matches={matches} />
              </div>
            </section>
          </div>
        </div>
      </main>

      {saveOpen && (
        <SaveDialog
          onOpenChange={setSaveOpen}
          pattern={pattern}
          flags={flags}
          text={text}
          current={current}
          onSaved={(saved) => load(saved)}
        />
      )}

      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        pattern={pattern}
        flags={flags}
      />

      <LibraryDialog
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        onLoad={handleLoad}
      />
    </PageChrome>
  );
}

function ResultView({ text, matches }: { text: string; matches: RawMatch[] }) {
  if (matches.length === 0) {
    return (
      <div className="result" id="result">
        {text}
      </div>
    );
  }

  const parts: React.ReactNode[] = [];
  let last = 0;
  matches.forEach((m, i) => {
    if (m.index > last) {
      parts.push(<span key={`t${i}`}>{text.slice(last, m.index)}</span>);
    }
    parts.push(<mark key={`m${i}`}>{m.text}</mark>);
    last = m.index + m.text.length;
  });
  if (last < text.length) parts.push(<span key="tail">{text.slice(last)}</span>);

  return (
    <div className="result" id="result">
      {parts}
    </div>
  );
}

function MatchesView({ matches }: { matches: RawMatch[] }) {
  const { t } = useI18n();

  if (matches.length === 0) {
    return <p className="empty">{t("out.none")}</p>;
  }

  return (
    <ul className="matches">
      {matches.map((m, i) => {
        const named = m.named ? Object.entries(m.named) : [];
        return (
          <li key={i} className="match">
            <div className="match-head">
              <span className="label">#{i + 1}</span>
              <span className="label">
                {m.index}-{m.index + m.text.length}
              </span>
            </div>
            <code>{m.text}</code>

            {(m.groups.length > 0 || named.length > 0) && (
              <dl className="groups">
                {m.groups.map((value, gi) => (
                  <GroupPair
                    key={gi}
                    label={`${t("out.group")} ${gi + 1}`}
                    value={value ?? "-"}
                  />
                ))}
                {named.map(([name, value]) => (
                  <GroupPair key={name} label={name} value={value ?? "-"} />
                ))}
              </dl>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function GroupPair({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}
