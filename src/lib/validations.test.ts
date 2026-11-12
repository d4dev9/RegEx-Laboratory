import { describe, expect, it } from "vitest";
import {
  explainSchema,
  patternSchema,
  testCaseSchema,
  updatePatternSchema,
  formatZodError,
} from "@/lib/validations";
import { MAX_INPUT_LENGTH, MAX_REGEX_LENGTH } from "@/lib/regex/limits";

describe("patternSchema", () => {
  const valid = {
    name: "Email",
    regex: "^[a-z]+@[a-z]+\\.com$",
    flags: "gi",
    language: "javascript" as const,
    isPublic: true,
    tags: ["validación"],
  };

  it("accepts a valid pattern", () => {
    expect(patternSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an oversized regex", () => {
    const result = patternSchema.safeParse({
      ...valid,
      regex: "a".repeat(MAX_REGEX_LENGTH + 1),
    });
    expect(result.success).toBe(false);
  });

  it("accepts a regex exactly at the limit", () => {
    const result = patternSchema.safeParse({
      ...valid,
      regex: "a".repeat(MAX_REGEX_LENGTH),
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown flags", () => {
    expect(patternSchema.safeParse({ ...valid, flags: "gz" }).success).toBe(false);
  });

  it("rejects an unknown language", () => {
    expect(
      patternSchema.safeParse({ ...valid, language: "cobol" }).success
    ).toBe(false);
  });

  it("rejects an oversized name", () => {
    expect(patternSchema.safeParse({ ...valid, name: "n".repeat(101) }).success).toBe(false);
  });

  it("rejects an oversized description", () => {
    expect(
      patternSchema.safeParse({ ...valid, description: "d".repeat(501) }).success
    ).toBe(false);
  });

  it("rejects too many tags", () => {
    const tags = Array.from({ length: 21 }, (_, i) => `tag${i}`);
    expect(patternSchema.safeParse({ ...valid, tags }).success).toBe(false);
  });

  it("rejects an oversized tag", () => {
    expect(patternSchema.safeParse({ ...valid, tags: ["t".repeat(51)] }).success).toBe(false);
  });

  it("accepts a sample text and allows clearing it with null", () => {
    const withText = patternSchema.safeParse({ ...valid, sharedText: "un ejemplo" });
    expect(withText.success).toBe(true);

    const cleared = patternSchema.safeParse({ ...valid, sharedText: null });
    expect(cleared.success).toBe(true);
  });

  it("rejects an oversized sample text", () => {
    const result = patternSchema.safeParse({
      ...valid,
      sharedText: "a".repeat(MAX_INPUT_LENGTH + 1),
    });
    expect(result.success).toBe(false);
  });
});

describe("updatePatternSchema", () => {

  it("does not fill in the fields it was not given", () => {
    const parsed = updatePatternSchema.parse({ name: "solo el nombre" });

    expect(parsed).toEqual({ name: "solo el nombre" });
    expect("isPublic" in parsed).toBe(false);
    expect("tags" in parsed).toBe(false);
    expect("flags" in parsed).toBe(false);
  });

  it("still accepts the fields it is given", () => {
    const parsed = updatePatternSchema.parse({ isPublic: true, sharedText: "texto" });

    expect(parsed.isPublic).toBe(true);
    expect(parsed.sharedText).toBe("texto");
  });

  it("still rejects an invalid flag", () => {
    const result = updatePatternSchema.safeParse({ flags: "gz" });
    expect(result.success).toBe(false);
  });
});

describe("testCaseSchema", () => {
  const valid = { patternId: "clx0a1b2c3d4e5f6g7h8i9", input: "abc", expected: true };

  it("accepts a valid test case", () => {
    expect(testCaseSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an oversized input", () => {
    const result = testCaseSchema.safeParse({
      ...valid,
      input: "a".repeat(MAX_INPUT_LENGTH + 1),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed patternId", () => {

    expect(testCaseSchema.safeParse({ ...valid, patternId: "../../etc" }).success).toBe(false);
  });

  it("rejects a missing expected flag", () => {
    expect(testCaseSchema.safeParse({ patternId: valid.patternId, input: "abc" }).success).toBe(false);
  });
});

describe("explainSchema", () => {
  it("applies defaults for flags", () => {
    const result = explainSchema.safeParse({ regex: "a+" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.flags).toBe("gm");
  });

  it("rejects an oversized regex", () => {
    expect(
      explainSchema.safeParse({ regex: "a".repeat(MAX_REGEX_LENGTH + 1) }).success
    ).toBe(false);
  });

  it("ignores a haystack instead of rejecting it", () => {

    const result = explainSchema.safeParse({
      regex: "a",
      input: "b".repeat(MAX_INPUT_LENGTH + 1),
    });
    expect(result.success).toBe(true);
    if (result.success) expect("input" in result.data).toBe(false);
  });

  it("rejects unknown flags", () => {
    expect(explainSchema.safeParse({ regex: "a", flags: "Q" }).success).toBe(false);
  });
});

describe("formatZodError", () => {
  it("flattens issues into a field map", () => {
    const result = patternSchema.safeParse({ name: "", regex: "a", flags: "!!" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = formatZodError(result.error);
      expect(Object.keys(fields).length).toBeGreaterThan(0);

      for (const value of Object.values(fields)) {
        expect(typeof value).toBe("string");
      }
    }
  });

  it("returns an empty object for a non-Zod error", () => {
    expect(formatZodError(new Error("boom"))).toEqual({});
  });
});