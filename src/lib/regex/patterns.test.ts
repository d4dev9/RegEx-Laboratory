import { describe, expect, it } from "vitest";
import { isRisky } from "@/lib/regex/core";
import {
  CATEGORIES,
  FEATURED_PATTERNS,
  PATTERNS,
  labHref,
  literal,
} from "@/lib/regex/patterns";

const ACCEPT: Record<string, string[]> = {
  email: ["soporte@ejemplo.com", "a.b+c@sub.domain.co"],
  url: ["https://ejemplo.com", "http://www.ejemplo.org/docs?page=2"],
  ipv4: ["192.168.1.1", "0.0.0.0", "255.255.255.255"],
  uuid: ["f47ac10b-58cc-4372-a567-0e02b2c3d479"],
  iso8601: ["2024-01-15T10:30:00Z", "2024-01-15T10:30:00.123+02:00"],
  card: ["4111111111111111", "5500005555555559", "378282246310005"],
  slug: ["mi-articulo", "post-2024", "abc"],
  username: ["usuario_01", "abc"],
  password: ["Segura2024!"],
  "postal-es": ["28013", "08001", "01001", "52999"],
  "dni-nie": ["12345678Z", "X1234567L"],
  phone: ["+34600000000", "+15551234567"],
  "hex-color": ["#4f46e5", "#fff", "#abcd"],
  "rgb-color": ["rgb(1, 2, 3)", "rgba(79, 70, 229, 0.5)"],
  json: ['{ "a": 1 }', "[1, 2, 3]"],
  base64: ["SGVsbG8gd29ybGQ=", "TWFu", "TWE=", "SGVsbG8="],
  "html-tag": ['<div class="card">Hola</div>', "<p>texto</p>"],
  "md-link": ["Ver [docs](https://ejemplo.com)"],
  "git-hash": ["da39a3ee5e6b4b0d3255bfef95601890afd80709"],
  semver: ["1.2.3", "v1.2.3-alpha.1", "0.0.1+build.5"],
  mac: ["00:1B:44:11:3A:B7", "aa-bb-cc-dd-ee-ff"],
};

const REJECT: Record<string, string[]> = {
  email: ["nope@localhost", "sin-arroba.com", "@ejemplo.com"],
  url: ["ejemplo.com", "ftp://ejemplo.com", "https://localhost"],
  ipv4: ["256.1.1.1", "1.2.3", "1.2.3.4.5"],
  uuid: ["f47ac10b-58cc-4372-a567", "f47ac10b-58cc-1372-a567-0e02b2c3d479"],
  iso8601: ["15-01-2024", "2024-01-15", "2024-01-15T10:30:00+2:00"],

  card: ["1234567812345678", "411111111111", "4111111111111111234"],

  slug: ["mi articulo", "mi--articulo", "-mi", "mi-", "mi/articulo"],
  username: ["ab", "a".repeat(21), "usuario-01"],
  password: ["corta1!", "sinmayusculas1!", "SinNumero!!"],

  "postal-es": ["00000", "99999", "2801", "280133"],
  "dni-nie": ["1234567", "A1234567Z", "12345678"],
  phone: ["600000000", "+0123456789", "++34600000000"],
  "hex-color": ["4f46e5", "#ggg", "#12345"],
  "rgb-color": ["rgb(1, 2)", "rgb(1,2,3"],
  json: ["sin llaves", "{ sin cerrar"],

  base64: ["SGVsbG8gd29ybGQ", "SGVsbG8=d29ybGQ=", "SGVsbG8=d29ybG==", "===="],
  "html-tag": ["<div>sin cerrar", "<span>a</div>"],
  "md-link": ["[sin destino]", "(solo url)"],
  "git-hash": ["da39a3ee", "z" + "a".repeat(39)],
  semver: ["1.2", "1.2.3.4", "01.2.3"],
  mac: ["00:1B:44:11:3A", "00-1B-44-11-3A-B7-CC"],
};

describe("pattern library", () => {
  it("holds exactly 21 patterns", () => {
    expect(PATTERNS).toHaveLength(21);
  });

  it("features exactly six for the landing page", () => {
    expect(FEATURED_PATTERNS).toHaveLength(6);
  });

  it("uses unique ids", () => {
    expect(new Set(PATTERNS.map((p) => p.id)).size).toBe(21);
  });

  it("declares only known categories", () => {
    for (const p of PATTERNS) {
      expect(CATEGORIES[p.cat]).toBeDefined();
    }
  });

  it("translates every name into both languages", () => {
    for (const p of PATTERNS) {
      expect(p.name.es.length).toBeGreaterThan(0);
      expect(p.name.en.length).toBeGreaterThan(0);
      expect(p.description.es.length).toBeGreaterThan(0);
      expect(p.description.en.length).toBeGreaterThan(0);
    }
  });

  it.each(PATTERNS.map((p) => [p.id, p] as const))(
    "%s compiles with its own flags",
    (_id, p) => {
      expect(() => new RegExp(p.regex, p.flags)).not.toThrow();
    }
  );

  it.each(PATTERNS.map((p) => [p.id, p] as const))(
    "%s is not rejected by the ReDoS guard",
    (_id, p) => {

      expect(isRisky(p.regex)).toBe(false);
    }
  );

  it.each(PATTERNS.map((p) => [p.id, p] as const))(
    "%s matches its documented example",
    (_id, p) => {
      expect(new RegExp(p.regex, p.flags).test(p.example)).toBe(true);
    }
  );

  it.each(PATTERNS.map((p) => [p.id, p] as const))(
    "%s accepts what it should",
    (id, p) => {
      for (const input of ACCEPT[id] ?? []) {

        const re = new RegExp(p.regex, p.flags);
        expect(`${id} <- ${input} -> ${re.test(input)}`).toBe(`${id} <- ${input} -> true`);
      }
    }
  );

  it.each(PATTERNS.map((p) => [p.id, p] as const))(
    "%s rejects what it should",
    (id, p) => {
      for (const input of REJECT[id] ?? []) {
        const re = new RegExp(p.regex, p.flags);
        expect(`${id} <- ${input} -> ${re.test(input)}`).toBe(`${id} <- ${input} -> false`);
      }
    }
  );
});

describe("the three corrections against the published site", () => {
  it("keeps Spanish codes that begin with zero", () => {

    const re = new RegExp(PATTERNS.find((p) => p.id === "postal-es")!.regex);
    expect(re.test("08001")).toBe(true);
    expect(re.test("01001")).toBe(true);
    expect(re.test("28013")).toBe(true);
    expect(re.test("00000")).toBe(false);
    expect(re.test("99999")).toBe(false);
  });

  it("matches an HTML tag with newlines inside", () => {

    const re = new RegExp(PATTERNS.find((p) => p.id === "html-tag")!.regex);
    expect(re.test("<div>a\nb</div>")).toBe(true);
    expect(re.test('<div class="x">Hola</div>')).toBe(true);
  });

  it("does not claim to validate JSON", () => {
    const json = PATTERNS.find((p) => p.id === "json")!;
    expect(json.name.es).toBe("JSON (comprobación básica)");
    expect(json.name.en).toBe("JSON (basic check)");
  });
});

describe("helpers", () => {
  it("renders a JavaScript literal with the slash escaped", () => {
    expect(literal("a/b", "gi")).toBe("/a\\/b/gi");
    expect(literal("\\d+", "")).toBe("/\\d+/");
  });

  it("builds a lab link carrying the pattern and flags in the hash", () => {
    const href = labHref("\\d+", "gi");
    expect(href.startsWith("/lab#")).toBe(true);
    const params = new URLSearchParams(href.slice("/lab#".length));
    expect(params.get("p")).toBe("\\d+");
    expect(params.get("f")).toBe("gi");
  });

  it("omits the flags when there are none", () => {
    const params = new URLSearchParams(labHref("a").slice("/lab#".length));
    expect(params.has("f")).toBe(false);
  });
});
