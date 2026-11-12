import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorState({
  title = "No pudimos cargar esta sección",
  message,
  digest,
  onRetry,
}: {
  title?: string;
  message?: string;
  digest?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border px-6 py-20 text-center">
      <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-md border">
        <AlertTriangle className="h-5 w-5" />
      </span>

      <h2 className="text-lg font-medium tracking-tight">{title}</h2>

      <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
        {message ??
          "Revisa tu conexión y que las variables de entorno de la base de datos sean correctas."}
      </p>

      {digest && (
        <p className="mt-3 font-mono text-xs text-slate-400 dark:text-slate-500">
          ref: {digest}
        </p>
      )}

      <Button
        variant="outline"
        size="sm"
        className="mt-6"
        onClick={() => (onRetry ? onRetry() : window.location.reload())}
      >
        <RefreshCw className="mr-1 h-4 w-4" />
        Reintentar
      </Button>
    </div>
  );
}