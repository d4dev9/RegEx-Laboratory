import { prisma } from "@/lib/prisma";

const MIB = 1024 * 1024;

export const MAX_USER_STORAGE_BYTES = readNumber(
  "MAX_USER_STORAGE_BYTES",
  3 * MIB
);

export const MAX_PATTERNS_PER_USER = readNumber("MAX_PATTERNS_PER_USER", 1000);

export const MAX_TEST_CASES_PER_USER = readNumber("MAX_TEST_CASES_PER_USER", 1000);

function readNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export interface PatternSize {
  name: string;
  description?: string | null;
  regex: string;
  tags: string[];
}

export interface TestCaseSize {
  input: string;
  description?: string | null;
}

function bytes(text: string): number {
  return Buffer.byteLength(text, "utf8");
}

export function patternBytes(pattern: PatternSize): number {
  let total = bytes(pattern.name) + bytes(pattern.regex);
  if (pattern.description) total += bytes(pattern.description);
  for (const tag of pattern.tags) total += bytes(tag);
  return total;
}

export function testCaseBytes(testCase: TestCaseSize): number {
  let total = bytes(testCase.input);
  if (testCase.description) total += bytes(testCase.description);
  return total;
}

export interface AccountUsage {
  bytes: number;
  patterns: number;
  testCases: number;
}

export interface QuotaViolation {
  kind: "storage" | "patterns" | "testCases";
  limit: number;
  used: number;
}

export function quotaViolation(
  usage: AccountUsage,
  adding: { bytes: number; patterns: number; testCases: number }
): QuotaViolation | null {
  if (usage.patterns + adding.patterns > MAX_PATTERNS_PER_USER) {
    return {
      kind: "patterns",
      limit: MAX_PATTERNS_PER_USER,
      used: usage.patterns,
    };
  }

  if (usage.testCases + adding.testCases > MAX_TEST_CASES_PER_USER) {
    return {
      kind: "testCases",
      limit: MAX_TEST_CASES_PER_USER,
      used: usage.testCases,
    };
  }

  if (usage.bytes + adding.bytes > MAX_USER_STORAGE_BYTES) {
    return {
      kind: "storage",
      limit: MAX_USER_STORAGE_BYTES,
      used: usage.bytes,
    };
  }

  return null;
}

export async function accountUsage(userId: string): Promise<AccountUsage> {
  const [patterns, testCases] = await Promise.all([
    prisma.pattern.findMany({
      where: { userId },
      select: { name: true, description: true, regex: true, tags: true },
    }),
    prisma.testCase.findMany({
      where: { userId },
      select: { input: true, description: true },
    }),
  ]);

  let bytesTotal = 0;
  for (const pattern of patterns) bytesTotal += patternBytes(pattern);
  for (const testCase of testCases) bytesTotal += testCaseBytes(testCase);

  return {
    bytes: bytesTotal,
    patterns: patterns.length,
    testCases: testCases.length,
  };
}
