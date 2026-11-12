import type { Metadata } from "next";

import { DocsContent } from "@/components/docs/DocsContent";

export const metadata: Metadata = {
  title: "Documentación",
  description:
    "Cómo usar Regex Lab: empezar, guardar y compartir, flags, errores frecuentes y biblioteca de 21 patrones.",
};

export default function DocsPage() {
  return <DocsContent />;
}
