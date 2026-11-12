import { describe, expect, it } from "vitest";
import { analyzeReDoS, compileUserRegex, scanMatches } from "@/lib/regex/safety";
import {
  MAX_INPUT_LENGTH,
  MAX_MATCHES,
  MAX_REGEX_LENGTH,
  MAX_SCAN_ITERATIONS,
} from "@/lib/regex/limits";

describe("analyzeReDoS — must flag", () => {
  const dangerous: Array<[string, string]> = [
    ["nested quantifier over a literal", "(a+)+"],
    ["nested quantifier over a class", "([a-z]+)*"],
    ["nested star over star", "(a*)*"],
    ["nested over escaped class", "(\\d+)+"],
    ["duplicate branches", "(a|a)+b"],
    ["duplicate branches, three-way", "(x|y|x)*c"],
    ["adjacent overlapping classes", "\\d+\\d+"],
    ["adjacent overlapping with group", "[a-z]+[a-z]+"],
    ["nested quantifier with anchors", "^(a+)+$"],
    ["huge counted repetition", "(?:a?){1,5000}"],
    ["branch overlapping a class", "^([a-z]|a)+$"],
    ["branch overlapping an escape", "^(\\d|1)+$"],
    ["one branch contains the other", "^(a|ab)+$"],
    ["optional inside a repeated group", "^(\\w+\\s?)+$"],
  ];

  it.each(dangerous)("%s: %s", (_label, pattern) => {
    expect(analyzeReDoS(pattern).length).toBeGreaterThan(0);
  });

  it("folds case when the flag is present", () => {
    expect(analyzeReDoS("^(a|A)+$", "i").length).toBeGreaterThan(0);
  });

  it("leaves the same pattern alone without the flag", () => {

    expect(analyzeReDoS("^(a|A)+$")).toEqual([]);
  });

  it("descends into a nested group", () => {

    expect(analyzeReDoS("^((a+))+$").length).toBeGreaterThan(0);
  });
});

describe("analyzeReDoS — must NOT flag", () => {
  const safe: Array<[string, string]> = [
    ["plain literal", "abc"],
    ["simple class", "[a-z]+"],
    ["email", "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"],
    ["IPv4: bounded repetition over alternation", "^(?:(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)$"],
    ["ISO date", "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{3})?(?:Z|[+-]\\d{2}:\\d{2})?$"],
    ["fixed-width alternation (hex colours)", "^#(?:[A-Fa-f0-9]{3}|[A-Fa-f0-9]{4}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$"],
    ["unbounded over a group with a mandatory separator (slug)", "^[a-z0-9]+(?:-[a-z0-9]+)*$"],
    ["unbounded over a group with a mandatory separator (url)", "^https?://[\\w-]+(?:\\.[\\w-]+)+/[^\\s]*$"],
    ["independent lookaheads (strong password)", "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[A-Za-z\\d]{8,}$"],
    ["greedy dot", ".*"],
    ["semver", "^v?(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$"],
    ["credit card alternation, bounded", "^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14})$"],
    ["Base64", "^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{4}|[A-Za-z0-9+/]{3}=)$"],
    ["lazy quantifier after group", "(?:ab)+?"],
    ["named group with quantifier", "(?<year>\\d{4})-(?<month>\\d{2})"],
    ["empty", ""],
    ["class and literal that do not overlap", "^([a-z]|[0-9])+$"],
    ["escape and class that do not overlap", "^(\\d|\\p{L})+$"],
    ["scheme alternation", "^(?:https?|ftp)+$"],
    ["distinct words", "^(?:cat|dog)+$"],
  ];

  it.each(safe)("%s: %s", (_label, pattern) => {
    expect(analyzeReDoS(pattern)).toEqual([]);
  });
});

describe("analyzeReDoS — structural properties", () => {
  it("reports an index into the original string", () => {
    const pattern = "abc(a+)+";
    const [finding] = analyzeReDoS(pattern);
    expect(pattern.slice(finding.index)).toContain("(a+)+");
  });

  it("reports a fragment that appears in the pattern", () => {
    const pattern = "^(\\d+)+$";
    for (const finding of analyzeReDoS(pattern)) {
      expect(pattern).toContain(finding.fragment);
    }
  });

  it("does not report the same site twice", () => {
    const findings = analyzeReDoS("(a+)+(b+)+");
    const keys = findings.map((f) => `${f.rule}:${f.index}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("compileUserRegex", () => {
  it("accepts a valid pattern", () => {
    const result = compileUserRegex("^[a-z]+$", "i");
    expect(result.ok).toBe(true);
  });

  it("rejects an empty pattern", () => {
    expect(compileUserRegex("", "").ok).toBe(false);
  });

  it("rejects syntactically invalid syntax", () => {
    const result = compileUserRegex("[a-z", "");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).not.toContain("ReDoS");
  });

  it("rejects unknown flags", () => {
    expect(compileUserRegex("a", "q").ok).toBe(false);
  });

  it("rejects a pattern that only becomes catastrophic with a flag", () => {

    expect(compileUserRegex("^(a|A)+$", "i").ok).toBe(false);
    expect(compileUserRegex("^(a|A)+$", "").ok).toBe(true);
  });

  it("rejects flags outside the allowlist", () => {
    expect(compileUserRegex("a", "gz").ok).toBe(false);
  });

  it("rejects a pattern over the length limit", () => {
    const huge = "a".repeat(MAX_REGEX_LENGTH + 1);
    const result = compileUserRegex(huge, "");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/límite/i);
  });

  it("accepts a pattern exactly at the length limit", () => {
    const exact = "a".repeat(MAX_REGEX_LENGTH);
    expect(compileUserRegex(exact, "").ok).toBe(true);
  });

  it("rejects a dangerous pattern and attaches the findings", () => {
    const result = compileUserRegex("(a+)+", "");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.redos?.length).toBeGreaterThan(0);
      expect(result.redos?.[0].rule).toBeDefined();
    }
  });
});

describe("scanMatches", () => {
  it("collects every match with the global flag", () => {
    const { matches, truncated } = scanMatches(/a/g, "aaa");
    expect(matches).toHaveLength(3);
    expect(truncated).toBe(false);
  });

  it("adds the global flag when the caller omitted it", () => {

    const { matches } = scanMatches(/a/, "aaaa");
    expect(matches).toHaveLength(4);
  });

  it("does not mutate the caller's regex flags", () => {
    const re = /a/;
    scanMatches(re, "aaa");
    expect(re.flags).toBe("");
    expect(re.global).toBe(false);
  });

  it("terminates on a zero-length match pattern", () => {

    const { matches, truncated } = scanMatches(/(?:)/g, "abcdef", {
      maxMatches: 5,
    });
    expect(matches.length).toBeLessThanOrEqual(5);
    expect(truncated).toBe(true);
  });

  it("respects maxMatches", () => {
    const { matches, truncated } = scanMatches(/a/g, "a".repeat(50), {
      maxMatches: 10,
    });
    expect(matches).toHaveLength(10);
    expect(truncated).toBe(true);
  });

  it("never returns more than the global cap", () => {
    const { matches } = scanMatches(/a/g, "a".repeat(MAX_MATCHES + 500));
    expect(matches.length).toBeLessThanOrEqual(MAX_MATCHES);
  });

  it("stops on the zero-length pattern before exhausting the iteration cap", () => {

    const { matches, truncated } = scanMatches(/(?:a|)/g, "a".repeat(200), {
      deadlineMs: 60_000,
    });
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.length).toBeLessThanOrEqual(MAX_SCAN_ITERATIONS);
    expect(truncated).toBe(false);
  });

  it("captures named groups", () => {
    const { matches } = scanMatches(/(?<y>\d{4})-(?<m>\d{2})/g, "2024-01 1999-12");
    expect(matches[0].groups).toEqual({ y: "2024", m: "01" });
    expect(matches[1].groups).toEqual({ y: "1999", m: "12" });
  });

  it("reports correct offsets", () => {
    const { matches } = scanMatches(/b/g, "abcabc");
    expect(matches).toHaveLength(2);
    expect(matches[0]).toMatchObject({ start: 1, end: 2, fullMatch: "b" });
    expect(matches[1]).toMatchObject({ start: 4, end: 5, fullMatch: "b" });
  });

  it("caps a large match count instead of returning everything", () => {

    const input = "a".repeat(MAX_INPUT_LENGTH);
    const { matches, truncated } = scanMatches(/a/g, input);
    expect(matches).toHaveLength(MAX_MATCHES);
    expect(truncated).toBe(true);
  });
});

describe("limits", () => {
  it("are documented and positive", () => {
    expect(MAX_REGEX_LENGTH).toBeGreaterThan(0);
    expect(MAX_INPUT_LENGTH).toBeGreaterThan(0);
    expect(MAX_MATCHES).toBeGreaterThan(0);
    expect(MAX_SCAN_ITERATIONS).toBeGreaterThan(MAX_MATCHES);
  });
});