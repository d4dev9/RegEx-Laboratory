import type { Metadata } from "next";

import { LegalContent } from "@/components/legal/LegalContent";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description:
    "Política de privacidad de Regex Lab: qué no recogemos, qué guardamos si creas cuenta, patrones públicos, proveedores y tus derechos.",
};

export default function PrivacyPage() {
  return <LegalContent kind="privacy" />;
}
