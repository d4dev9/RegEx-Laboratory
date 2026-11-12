import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { DICTIONARY, LOCALES, type DictKey } from "./dictionary";

const SRC = join(process.cwd(), "src");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(tsx?|css)$/.test(full)) out.push(full);
  }
  return out;
}

const FILES = walk(SRC).filter(
  (f) =>

    !f.includes(join("src", "generated")) &&
    !f.endsWith("audit.test.ts")
);

const OUT_OF_SCOPE = [
  join("components", "ui"),
  join("components", "dashboard"),
  join("app", "(dashboard)"),
];

const OWNED = FILES.filter((f) => !OUT_OF_SCOPE.some((p) => f.includes(p)));

const EMOJI = /\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}]/u;

const ALLOWED_NON_ASCII =
  /[áéíóúüñÁÉÍÓÚÜÑ¿¡§€–—’“”·«»º©…]/;

const ROUTES = [
  "/",
  "/lab",
  "/cheatsheet",
  "/docs",
  "/terms",
  "/privacy",
  "/signin",
  "/p/",
  "/api/auth",
  "/api/patterns",
  "/api/public/patterns",
  "/api/account",
];

describe("audit: no emojis", () => {
  it("finds none in the files this audit owns", () => {
    const found: string[] = [];
    for (const file of OWNED) {
      const text = readFileSync(file, "utf8");
      for (const line of text.split("\n")) {

        const bare = line.replace(/[©«»º…·]/g, "");
        if (EMOJI.test(bare)) {
          found.push(`${file}: ${line.trim().slice(0, 80)}`);
        }
      }
    }
    expect(found).toEqual([]);
  });
});

describe("audit: no hardcoded colours outside the token scale", () => {
  it("finds none in component and app styles", () => {
    const found: string[] = [];

    const literal = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/;

    for (const file of OWNED) {
      if (!file.endsWith(".css")) continue;
      const text = readFileSync(file, "utf8");
      text.split("\n").forEach((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("*") || trimmed.startsWith("/*")) return;
        if (literal.test(line)) {
          found.push(`${file}:${i + 1}: ${trimmed.slice(0, 80)}`);
        }
      });
    }

    const violations = found.filter(
      (f) => !f.includes("globals.css") && !f.includes(join("styles", "tokens.css"))
    );
    expect(violations).toEqual([]);
  });
});

describe("audit: no arbitrary spacing outside the 4px scale", () => {
  it("uses only multiples of four for padding and margin", () => {
    const found: string[] = [];

    const arbitrary = /\b(?:p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|space-[xy])-\[(\d+)px\]/g;

    for (const file of OWNED) {
      const text = readFileSync(file, "utf8");
      let m: RegExpExecArray | null;
      while ((m = arbitrary.exec(text))) {
        const value = Number(m[1]);
        if (value % 4 !== 0) {
          found.push(`${file}: ${m[0]} (${value}px is not a multiple of 4)`);
        }
      }
    }
    expect(found).toEqual([]);
  });
});

describe("audit: i18n keys are all translated", () => {
  it("has both languages for every key", () => {
    const missing: string[] = [];
    for (const key of Object.keys(DICTIONARY) as DictKey[]) {
      for (const lang of LOCALES) {
        if (!DICTIONARY[key]?.[lang]) missing.push(`${key}.${lang}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("has no unused keys", () => {

    const source = FILES.filter((f) => !f.endsWith("dictionary.ts"))
      .map((f) => readFileSync(f, "utf8"))
      .join("\n");

    const interpolatedPrefixes = new Set(
      [...source.matchAll(/["'`]([a-z0-9]+(?:\.[a-z0-9]+)*)\.\$\{/g)].map(
        (m) => m[1] + "."
      )
    );
    const interpolatedSuffixes = new Set(
      [...source.matchAll(/\$\{[a-zA-Z.]+\}(\.[a-zA-Z0-9]+)/g)].map((m) => m[1])
    );

    const unused = (Object.keys(DICTIONARY) as DictKey[]).filter(
      (key) =>
        !source.includes(`"${key}"`) &&
        !source.includes(`\`${key}\``) &&
        ![...interpolatedPrefixes].some((prefix) => key.startsWith(prefix)) &&
        ![...interpolatedSuffixes].some((suffix) => key.endsWith(suffix))
    );
    expect(unused).toEqual([]);
  });
});

describe("audit: links", () => {
  it("points only at routes that exist", () => {
    const found: string[] = [];

    const internal = /(?:href|to|redirectUrl)=?\{?["`](\/[a-z0-9\-/_]*)["`}]?/g;

    for (const file of FILES) {
      if (file.includes(join("app", "api"))) continue;
      const text = readFileSync(file, "utf8");
      let m: RegExpExecArray | null;
      while ((m = internal.exec(text))) {
        const href = m[1];
        if (href.startsWith("/_next")) continue;

        const known = ROUTES.some((r) => href === r || href.startsWith(r));
        if (!known) found.push(`${file}: ${href}`);
      }
    }
    expect(found).toEqual([]);
  });

  it("keeps every anchor the documentation links to", () => {
    const docs = readFileSync(
      join(SRC, "components", "docs", "DocsContent.tsx"),
      "utf8"
    );
    for (const id of ["empezar", "guardar", "flancos", "errores", "biblioteca"]) {
      expect(docs).toContain(`"${id}"`);
    }
  });
});

describe("audit: prose", () => {
  it("uses only characters a Spanish or English page needs", () => {
    const found: string[] = [];
    for (const file of OWNED) {
      const text = readFileSync(file, "utf8");
      for (const line of text.split("\n")) {
        const trimmed = line.trim();

        if (
          trimmed.startsWith("//") ||
          trimmed.startsWith("*") ||
          trimmed.startsWith("/*") ||
          trimmed.includes(".replace(/[")
        ) {
          continue;
        }
        for (const ch of line) {
          if (ch.codePointAt(0)! > 127 && !ALLOWED_NON_ASCII.test(ch)) {
            found.push(`${file}: U+${ch.codePointAt(0)!.toString(16)} in "${trimmed.slice(0, 60)}"`);
            break;
          }
        }
      }
    }
    expect(found).toEqual([]);
  });

  it("contains no filler phrases", () => {

    const FILLER = [
      "lorem ipsum",
      "dolor sit amet",
      "coming soon",
      "próximamente",
      "placeholder text",
      "your text here",
      "sample text here",
      "\\btodo\\b\\s*:",
      "\\bfixme\\b",
      "\\bhack\\b\\s*:",
    ];

    const found: string[] = [];
    for (const file of OWNED) {
      const text = readFileSync(file, "utf8").toLowerCase();
      for (const phrase of FILLER) {
        if (new RegExp(phrase, "i").test(text)) found.push(`${file}: ${phrase}`);
      }
    }
    expect(found).toEqual([]);
  });
});

describe("audit: accessibility basics", () => {
  it("labels every icon-only button", () => {
    const found: string[] = [];

    const button = /<button[^>]*>([\s\S]{0,400}?)<\/button>/g;

    for (const file of OWNED) {
      if (!file.endsWith(".tsx")) continue;
      const text = readFileSync(file, "utf8");
      let m: RegExpExecArray | null;
      while ((m = button.exec(text))) {
        const whole = m[0];
        const body = m[1];
        const hasAriaLabel = /aria-label=/.test(whole);
        const hasText = />[^<{]*[a-zA-Z\u00C0-\u024F]{2}/.test(body);
        const hasSrOnly = /sr-only/.test(body);
        const isIconOnly = /<svg/.test(body) && !hasText;
        if (isIconOnly && !hasAriaLabel && !hasSrOnly) {
          found.push(`${file}: ${whole.slice(0, 70).replace(/\s+/g, " ")}`);
        }
      }
    }
    expect(found).toEqual([]);
  });

  it("keeps a single h1 per page component", () => {
    const found: string[] = [];
    for (const file of OWNED) {
      if (!file.endsWith(".tsx")) continue;

      if (!/Content\.tsx$|HomeContent/.test(file)) continue;
      const count = (readFileSync(file, "utf8").match(/<h1/g) ?? []).length;
      if (count !== 1) found.push(`${file}: ${count} h1 elements`);
    }
    expect(found).toEqual([]);
  });

  it("marks decorative icons as hidden from assistive tech", () => {
    const found: string[] = [];
    for (const file of OWNED) {
      if (!file.endsWith(".tsx")) continue;
      const text = readFileSync(file, "utf8");

      const svgs = text.match(/<svg[\s\S]{0,300}?>/g) ?? [];
      svgs.forEach((svg) => {
        if (/aria-hidden/.test(svg) || /\{\.\.\./.test(svg)) return;
        found.push(`${file}: ${svg.slice(0, 60).replace(/\s+/g, " ")}`);
      });
    }
    expect(found).toEqual([]);
  });
});
