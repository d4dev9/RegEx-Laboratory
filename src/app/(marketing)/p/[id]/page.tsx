import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { PublicPatternContent } from "@/components/publicpattern/PublicPatternContent";
import { slashForm } from "@/lib/matcher";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

async function findPublic(id: string) {
  return prisma.pattern.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      regex: true,
      flags: true,
      tags: true,
      isPublic: true,
      sharedText: true,
      user: { select: { name: true } },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const pattern = await findPublic(id);

  if (!pattern || !pattern.isPublic) {
    return { title: "Patrón no encontrado", robots: { index: false, follow: false } };
  }

  const description = `${slashForm(pattern.regex, pattern.flags)} — ${pattern.name}`;
  return {
    title: pattern.name,
    description,
    openGraph: { title: pattern.name, description },
    twitter: { card: "summary_large_image", title: pattern.name, description },
  };
}

export default async function PublicPatternPage({ params }: Props) {
  const { id } = await params;
  const pattern = await findPublic(id);

  if (!pattern || !pattern.isPublic) {
    notFound();
  }

  return (
    <PublicPatternContent
      id={pattern.id}
      name={pattern.name}
      pattern={pattern.regex}
      flags={pattern.flags}
      tags={pattern.tags}
      sharedText={pattern.sharedText ?? null}
      author={pattern.user?.name ?? null}
    />
  );
}
