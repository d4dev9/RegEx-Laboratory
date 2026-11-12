import { getDbUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { isZodError, testCaseSchema } from "@/lib/validations";
import { accountUsage, quotaViolation, testCaseBytes } from "@/lib/quota";
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

export async function POST(request: NextRequest) {
  try {
    const user = await getDbUser();
    if (!user) return unauthorized();

    const body = await readJsonBody(request);
    const validated = testCaseSchema.parse(body);

    const pattern = await prisma.pattern.findUnique({
      where: { id: validated.patternId },
    });

    if (!pattern) return notFound("Patrón no encontrado");
    if (pattern.userId !== user.id) return forbidden();

    const usage = await accountUsage(user.id);
    const violation = quotaViolation(usage, {
      bytes: testCaseBytes({
        input: validated.input,
        description: validated.description,
      }),
      patterns: 0,
      testCases: 1,
    });
    if (violation) return quotaExceeded(violation);

    const testCase = await prisma.testCase.create({
      data: {
        ...validated,
        userId: user.id,
      },
    });

    return NextResponse.json(testCase, { status: 201 });
  } catch (error) {
    if (error instanceof BodyTooLargeError) return bodyTooLarge();
    if (isZodError(error)) return badRequest(error);
    return internalError("POST /api/test-cases error:", error);
  }
}
