import { describe, expect, it } from "vitest";

import {
  MAX_PATTERNS_PER_USER,
  MAX_TEST_CASES_PER_USER,
  MAX_USER_STORAGE_BYTES,
  patternBytes,
  quotaViolation,
  testCaseBytes,
} from "@/lib/quota";

describe("patternBytes", () => {
  it("counts the text that is stored", () => {
    const bytes = patternBytes({
      name: "Email",
      description: "busca correos",
      regex: "a+",
      tags: ["uno", "dos"],
    });

    expect(bytes).toBeGreaterThan(0);
    expect(bytes).toBe(
      Buffer.byteLength("Email") +
        Buffer.byteLength("busca correos") +
        Buffer.byteLength("a+") +
        Buffer.byteLength("uno") +
        Buffer.byteLength("dos")
    );
  });

  it("counts the accents as the bytes they take", () => {
    const withAccent = patternBytes({ name: "ñ", regex: "", tags: [] });
    const withoutAccent = patternBytes({ name: "n", regex: "", tags: [] });

    expect(withAccent).toBe(2);
    expect(withoutAccent).toBe(1);
  });
});

describe("testCaseBytes", () => {
  it("counts the input and its description", () => {
    expect(
      testCaseBytes({ input: "abc", description: "uno" })
    ).toBe(Buffer.byteLength("abc") + Buffer.byteLength("uno"));
  });

  it("does not count a missing description", () => {
    expect(testCaseBytes({ input: "abc" })).toBe(3);
  });
});

describe("quotaViolation", () => {
  const usage = { bytes: 0, patterns: 0, testCases: 0 };

  it("lets a write through while there is room", () => {
    expect(
      quotaViolation(usage, { bytes: 100, patterns: 1, testCases: 1 })
    ).toBeNull();
  });

  it("refuses when the storage budget is spent", () => {
    const violation = quotaViolation(
      { bytes: MAX_USER_STORAGE_BYTES, patterns: 0, testCases: 0 },
      { bytes: 1, patterns: 0, testCases: 0 }
    );

    expect(violation?.kind).toBe("storage");
    expect(violation?.limit).toBe(MAX_USER_STORAGE_BYTES);
  });

  it("refuses when there are too many patterns", () => {
    const violation = quotaViolation(
      { bytes: 0, patterns: MAX_PATTERNS_PER_USER, testCases: 0 },
      { bytes: 1, patterns: 1, testCases: 0 }
    );

    expect(violation?.kind).toBe("patterns");
  });

  it("refuses when there are too many test cases", () => {
    const violation = quotaViolation(
      { bytes: 0, patterns: 0, testCases: MAX_TEST_CASES_PER_USER },
      { bytes: 1, patterns: 0, testCases: 1 }
    );

    expect(violation?.kind).toBe("testCases");
  });

  it("counts the patterns before the bytes", () => {

    const violation = quotaViolation(
      {
        bytes: MAX_USER_STORAGE_BYTES,
        patterns: MAX_PATTERNS_PER_USER,
        testCases: 0,
      },
      { bytes: 1, patterns: 1, testCases: 0 }
    );

    expect(violation?.kind).toBe("patterns");
  });

  it("lets an update that does not grow the account through", () => {
    expect(
      quotaViolation(
        { bytes: MAX_USER_STORAGE_BYTES, patterns: 1, testCases: 0 },
        { bytes: 0, patterns: 0, testCases: 0 }
      )
    ).toBeNull();
  });
});

describe("los limites", () => {
  it("son los que dice el entorno", () => {

    expect(MAX_USER_STORAGE_BYTES).toBe(3 * 1024 * 1024);
    expect(MAX_PATTERNS_PER_USER).toBeGreaterThan(0);
    expect(MAX_TEST_CASES_PER_USER).toBeGreaterThan(0);
  });

  it("deja el presupuesto a los bytes y no a los elementos", () => {

    const smallCases = 500;
    expect(smallCases).toBeLessThan(MAX_TEST_CASES_PER_USER);

    const bytesOfThem = smallCases * 1024;
    expect(bytesOfThem).toBeLessThan(MAX_USER_STORAGE_BYTES);
  });
});
