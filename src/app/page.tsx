import { HomeContent } from "@/components/home/HomeContent";
import { PageChrome } from "@/components/shared/PageChrome";

export const metadata = {
  title: "Regex Lab — Escribe, entiende y depura RegEx",
  description:
    "Editor visual de RegEx con tester en tiempo real, explicación token-a-token, biblioteca personal y export multi-lenguaje.",
};

export default function HomePage() {
  return (
    <PageChrome meta={{ title: "meta.title", description: "meta.desc" }}>
      <HomeContent />
    </PageChrome>
  );
}
