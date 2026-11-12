"use client";

import { useState } from "react";

import { useI18n } from "@/lib/i18n/provider";
import { AuthOverlay } from "@/components/account/AuthDialog";
import { useAuthAdapter } from "./AuthProvider";

export function SignOutDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const { signOut } = useAuthAdapter();
  const [busy, setBusy] = useState(false);

  return (
    <AuthOverlay
      open={open}
      onOpenChange={onOpenChange}
      title={t("signout.title")}
      titleId="signout-title"
      width="dialog dialog-signout"
    >
      <p className="muted export-lead">{t("signout.sub")}</p>

      <div className="dlg-actions">
        <button
          type="button"
          className="btn"
          id="signout-cancel"
          onClick={() => onOpenChange(false)}
          disabled={busy}
        >
          {t("signout.cancel")}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          id="signout-confirm"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await signOut();

              window.location.replace("/");
            } finally {
              setBusy(false);
            }
          }}
        >
          {t("acct.signout")}
        </button>
      </div>
    </AuthOverlay>
  );
}