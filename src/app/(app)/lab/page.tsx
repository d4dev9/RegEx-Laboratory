import type { Metadata } from "next";

import { LabClient } from "@/components/lab/LabClient";

export const metadata: Metadata = {
  title: "Laboratorio",
  description:
    "Editor visual de RegEx con tester en tiempo real, explicación token-a-token, biblioteca personal y export multi-lenguaje.",
};

export default function LabPage() {
  return <LabClient />;
}
