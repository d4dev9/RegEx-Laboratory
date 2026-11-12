import type { Metadata } from "next";

import { CheatsheetContent } from "@/components/cheatsheet/CheatsheetContent";

export const metadata: Metadata = {
  title: "Cheatsheet",
  description:
    "Referencia rápida de sintaxis RegEx: anclas, clases, cuantificadores, grupos, lookarounds, flags y escapes.",
};

export default function CheatsheetPage() {
  return <CheatsheetContent />;
}
