import type { SupportedLanguage } from "./exporter";
import { PATTERNS } from "./patterns";

export interface StarterPattern {
  name: string;
  description: string;
  regex: string;
  flags: string;
  language: SupportedLanguage;
  tags: string[];

  example: string;
}

const TAGS: Record<string, string[]> = {
  email: ["validación", "formularios", "email"],
  url: ["validación", "web", "url"],
  ipv4: ["red", "validación"],
  uuid: ["identificadores", "api", "uuid"],
  iso8601: ["fechas", "api", "iso"],
  card: ["pagos", "validación", "finanzas"],
  slug: ["web", "seo", "url"],
  username: ["validación", "auth", "username"],
  password: ["validación", "auth", "seguridad"],
  "postal-es": ["españa", "validación", "postal"],
  "dni-nie": ["españa", "validación", "identidad"],
  phone: ["teléfono", "validación", "internacional"],
  "hex-color": ["css", "color", "frontend"],
  "rgb-color": ["css", "color", "frontend"],
  json: ["json", "validación", "api"],
  base64: ["encoding", "base64", "validación"],
  "html-tag": ["html", "parsing", "frontend"],
  "md-link": ["markdown", "parsing", "texto"],
  "git-hash": ["git", "versionado", "devops"],
  semver: ["versionado", "semver", "npm"],
  mac: ["red", "mac", "validación"],
};

export const STARTER_PATTERNS: StarterPattern[] = PATTERNS.filter(
  (pattern) => TAGS[pattern.id] !== undefined
).map((pattern) => ({
  name: pattern.name.es,
  description: pattern.description.es,
  regex: pattern.regex,
  flags: pattern.flags,
  language: "javascript",
  tags: TAGS[pattern.id],
  example: pattern.example,
}));

export const STARTER_TAGS: string[] = Array.from(
  new Set(STARTER_PATTERNS.flatMap((p) => p.tags))
).sort((a, b) => a.localeCompare(b, "es"));

export function validateStarterPatterns(): string[] {
  const problems: string[] = [];
  for (const p of STARTER_PATTERNS) {
    try {
      new RegExp(p.regex, p.flags);
    } catch (error) {
      problems.push(
        `${p.name}: ${error instanceof Error ? error.message : "regex inválida"}`
      );
    }
    if (p.example) {
      try {
        if (!new RegExp(p.regex, p.flags).test(p.example)) {
          problems.push(`${p.name}: el ejemplo "${p.example}" no coincide`);
        }
      } catch {
        // Already reported above.
      }
    }

    if (!problems.length) {
      try {
        if (new RegExp(p.regex, p.flags).test("")) {
          problems.push(`${p.name}: coincide con la cadena vacía`);
        }
      } catch {
        // Already reported above.
      }
    }
  }
  return problems;
}
