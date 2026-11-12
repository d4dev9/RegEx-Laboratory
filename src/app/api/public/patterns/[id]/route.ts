import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { internalError, notFound } from "@/lib/api-response";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    const pattern = await prisma.pattern.findFirst({
      where: { id, isPublic: true },
      select: {
        id: true,
        name: true,
        regex: true,
        flags: true,
        tags: true,
        sharedText: true,
        user: { select: { name: true } },
      },
    });

    if (!pattern) return notFound("Patrón no encontrado");

    return NextResponse.json({
      id: pattern.id,
      name: pattern.name,
      regex: pattern.regex,
      flags: pattern.flags,
      tags: pattern.tags,
      sharedText: pattern.sharedText ?? null,
      author: pattern.user.name ?? null,
    });
  } catch (error) {
    return internalError("GET /api/public/patterns/[id] error:", error);
  }
}
