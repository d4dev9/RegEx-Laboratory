import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();

  const { prisma } = await import("@/lib/prisma");

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { status: "ok", db: "reachable", latencyMs: Date.now() - startedAt },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {

    console.error("Health check failed: database unreachable", error);
    return NextResponse.json(
      { status: "degraded", db: "unreachable" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}