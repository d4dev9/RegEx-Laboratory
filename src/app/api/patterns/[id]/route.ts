import { getDbUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { isZodError, updatePatternSchema } from "@/lib/validations";
import { compileUserRegex } from "@/lib/regex/safety";
import {
  accountUsage,
  patternBytes,
  quotaViolation,
} from "@/lib/quota";
import {
  badRequest,
  bodyTooLarge,
  forbidden,
  internalError,
  notFound,
  quotaExceeded,
  unauthorized,
} from "@/lib/api-response";
import { BodyTooLargeError, readJsonBody } from "@/lib/request-body";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getDbUser();
    if (!user) return unauthorized();

    const { id } = await params;
    const pattern = await prisma.pattern.findUnique({
      where: { id },
      include: {
        testCases: { orderBy: { createdAt: "asc" } },
        user: { select: { name: true, avatarUrl: true } },
      },
    });

    if (!pattern || pattern.userId !== user.id) {
      return notFound("Patrón no encontrado");
    }

    return NextResponse.json(pattern);
  } catch (error) {
    return internalError("GET /api/patterns/[id] error:", error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getDbUser();
    if (!user) return unauthorized();

    const { id } = await params;
    const body = await readJsonBody(request);
    const validated = updatePatternSchema.parse(body);

    const pattern = await prisma.pattern.findUnique({ where: { id } });
    if (!pattern) return notFound("Patrón no encontrado");
    if (pattern.userId !== user.id) return forbidden();

    if (validated.regex) {
      const compiled = compileUserRegex(
        validated.regex,
        validated.flags ?? pattern.flags
      );
      if (!compiled.ok) {
        return NextResponse.json(
          { error: compiled.error, redos: compiled.redos },
          { status: 400 }
        );
      }
    }

    const isPublic = validated.isPublic ?? pattern.isPublic;

    const usage = await accountUsage(user.id);
    const before = patternBytes({
      name: pattern.name,
      description: pattern.description,
      regex: pattern.regex,
      tags: pattern.tags,
    });
    const after = patternBytes({
      name: validated.name ?? pattern.name,
      description: validated.description ?? pattern.description,
      regex: validated.regex ?? pattern.regex,
      tags: validated.tags ?? pattern.tags,
    });
    const violation = quotaViolation(usage, {
      bytes: Math.max(0, after - before),
      patterns: 0,
      testCases: 0,
    });
    if (violation) return quotaExceeded(violation);

    const updated = await prisma.pattern.update({
      where: { id },
      data: {
        ...validated,
        ...(isPublic ? {} : { sharedText: null }),
      },
      include: {
        testCases: true,
        user: { select: { name: true, avatarUrl: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof BodyTooLargeError) return bodyTooLarge();
    if (isZodError(error)) return badRequest(error);
    return internalError("PATCH /api/patterns/[id] error:", error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getDbUser();
    if (!user) return unauthorized();

    const { id } = await params;
    const pattern = await prisma.pattern.findUnique({ where: { id } });
    if (!pattern) return notFound("Patrón no encontrado");
    if (pattern.userId !== user.id) return forbidden();

    await prisma.pattern.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return internalError("DELETE /api/patterns/[id] error:", error);
  }
}
