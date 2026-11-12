"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/shared/ErrorState";

export default function PublicPatternError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[public-pattern]", error);
  }, [error]);

  return (
    <ErrorState
      title="No pudimos cargar este patrón"
      message={error.message}
      digest={error.digest}
      onRetry={reset}
    />
  );
}