import { NextResponse } from "next/server";
import { STARTER_PATTERNS, STARTER_TAGS } from "@/lib/regex/starter-patterns";

export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json(
    { patterns: STARTER_PATTERNS, tags: STARTER_TAGS, total: STARTER_PATTERNS.length },
    {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    }
  );
}