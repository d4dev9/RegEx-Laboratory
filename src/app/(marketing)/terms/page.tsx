import type { Metadata } from "next";

import { LegalContent } from "@/components/legal/LegalContent";

export const metadata: Metadata = {
  title: "Términos de servicio",
  description:
    "Términos de servicio de Regex Lab: objeto del servicio, uso aceptable, contenidos, garantía y responsabilidad.",
};

export default function TermsPage() {
  return <LegalContent kind="terms" />;
}
