"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/shared/ErrorState";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {

    console.error("Unhandled application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <ErrorState
        title="Algo ha salido mal"
        message="Ha ocurrido un error inesperado. Puedes reintentar la operación."
        digest={error.digest}
        onRetry={reset}
      />
    </div>
  );
}