import { getDbUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { isZodError, patternSchema } from "@/lib/validations";
import { compileUserRegex } from "@/lib/regex/safety";
import {
  accountUsage,
  patternBytes,
  quotaViolation,
} from "@/lib/quota";
import {
  badRequest,
  bodyTooLarge,
  internalError,
  quotaExceeded,
  unauthorized,
} from "@/lib/api-response";
import { BodyTooLargeError, readJsonBody } from "@/lib/request-body";
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getDbUser();
    if (!user) return unauthorized();

    const { searchParams } = new URL(request.url);

    const parsedPage = parseInt(searchParams.get("page") || "1", 10);
    const parsedLimit = parseInt(searchParams.get("limit") || "20", 10);
    const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const limit =
      Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, 100)
        : 20;
    const search = (searchParams.get("search") || "").slice(0, 100);
    const tag = (searchParams.get("tag") || "").slice(0, 50);
    const isPublic = searchParams.get("public") === "true";

    const where: Prisma.PatternWhereInput = { userId: user.id };

    if (isPublic) {
      where.isPublic = true;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { regex: { contains: search, mode: "insensitive" } },
      ];
    }

    if (tag) {
      where.tags = { has: tag };
    }

    const [patterns, total] = await Promise.all([
      prisma.pattern.findMany({
        where,
        include: {
          testCases: { select: { id: true } },
          user: { select: { name: true, avatarUrl: true } },
        },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.pattern.count({ where }),
    ]);

    return NextResponse.json({
      patterns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return internalError("GET /api/patterns error:", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getDbUser();
    if (!user) return unauthorized();

    const body = await readJsonBody(request);
    const validated = patternSchema.parse(body);

    const compiled = compileUserRegex(validated.regex, validated.flags);
    if (!compiled.ok) {
      return NextResponse.json(
        { error: compiled.error, redos: compiled.redos },
        { status: 400 }
      );
    }

    const { sharedText, ...fields } = validated;

    const usage = await accountUsage(user.id);
    const violation = quotaViolation(usage, {
      bytes: patternBytes({
        name: fields.name,
        description: fields.description,
        regex: fields.regex,
        tags: fields.tags,
      }),
      patterns: 1,
      testCases: 0,
    });
    if (violation) return quotaExceeded(violation);

    const pattern = await prisma.pattern.create({
      data: {
        ...fields,
        sharedText: fields.isPublic ? (sharedText ?? null) : null,
        userId: user.id,
      },
      include: {
        testCases: true,
        user: { select: { name: true, avatarUrl: true } },
      },
    });

    return NextResponse.json(pattern, { status: 201 });
  } catch (error) {
    if (error instanceof BodyTooLargeError) return bodyTooLarge();
    if (isZodError(error)) return badRequest(error);
    return internalError("POST /api/patterns error:", error);
  }
}
