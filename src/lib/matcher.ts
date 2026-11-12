import { isRisky } from "@/lib/regex/core";
import { MAX_MATCHES } from "@/lib/regex/limits";

export interface RawMatch {
  index: number;
  text: string;

  groups: (string | undefined)[];

  named: Record<string, string | undefined> | null;
}

export type MatchResult =
  | { ok: true; matches: RawMatch[]; truncated: boolean }
  | { ok: false; reason: "risky" | "invalid"; message?: string };

export function collectMatches(
  source: string,
  flags: string,
  text: string,
  maxMatches: number = MAX_MATCHES
): MatchResult {
  if (isRisky(source, flags)) {
    return { ok: false, reason: "risky" };
  }

  const effective = flags.includes("g") ? flags : `${flags}g`;

  let re: RegExp;
  try {
    re = new RegExp(source, effective);
  } catch (e) {

    return {
      ok: false,
      reason: "invalid",
      message: e instanceof Error ? e.message : String(e),
    };
  }

  const matches: RawMatch[] = [];
  let truncated = false;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {

    if (m[0].length === 0) {
      re.lastIndex++;
      if (re.lastIndex > text.length) break;
      continue;
    }

    matches.push({
      index: m.index,
      text: m[0],
      groups: m.slice(1),
      named: m.groups ?? null,
    });

    if (matches.length >= maxMatches) {
      truncated = true;
      break;
    }
  }

  return { ok: true, matches, truncated };
}

export function slashForm(source: string, flags: string): string {
  return `/${source.replace(/\\[\s\S]|\//g, (x) => (x === "/" ? "\\/" : x))}/${flags}`;
}
