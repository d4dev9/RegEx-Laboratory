import {
  ALLOWED_FLAGS,
  MAX_MATCHES,
  MAX_REGEX_LENGTH,
  MAX_SCAN_ITERATIONS,
} from "./limits";

export interface RedosFinding {

  rule:
    | "duplicate-branch"
    | "nested-quantifier"
    | "adjacent-overlapping-quantifiers"
    | "large-counted-repetition";

  message: string;

  index: number;

  fragment: string;
}

interface Quantifier {
  quant: string;
  next: number;
  min: number;
  max: number;
}

function maskClasses(pattern: string): { masked: string; map: number[] } {
  let masked = "";
  const map: number[] = [];
  let inClass = false;

  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];

    if (ch === "\\" && i + 1 < pattern.length) {

      masked += "\\x";
      map.push(i);
      map.push(i + 1);
      i++;
      continue;
    }

    if (!inClass && ch === "[") {
      inClass = true;
      masked += "[";
      map.push(i);
      continue;
    }

    if (inClass) {
      if (ch === "]") {
        inClass = false;
        masked += "]";
      } else {
        masked += "c";
      }
      map.push(i);
      continue;
    }

    masked += ch;
    map.push(i);
  }

  return { masked, map };
}

function readQuantifier(masked: string, i: number): Quantifier | null {
  const ch = masked[i];
  if (ch === "*") return { quant: "*", next: i + 1, min: 0, max: Infinity };
  if (ch === "+") return { quant: "+", next: i + 1, min: 1, max: Infinity };
  if (ch === "?") return { quant: "?", next: i + 1, min: 0, max: 1 };

  if (ch === "{") {
    const close = masked.indexOf("}", i);
    if (close === -1) return null;
    const body = masked.slice(i + 1, close);

    if (!/^\d+(,\d*)?$/.test(body)) return null;
    const [nStr, mStr] = body.split(",");
    const min = parseInt(nStr, 10);
    const max = mStr === undefined ? min : mStr === "" ? Infinity : parseInt(mStr, 10);
    return { quant: body, next: close + 1, min, max };
  }

  return null;
}

function findAtomStart(masked: string, i: number): number {
  if (i <= 0) return -1;
  let j = i - 1;

  if (masked[j] === ")") {
    let depth = 0;
    for (; j >= 0; j--) {
      if (masked[j] === ")") depth++;
      else if (masked[j] === "(") {
        depth--;
        if (depth === 0) return j;
      }
    }
    return -1;
  }

  if (masked[j] === "]") {
    for (; j >= 0; j--) {
      if (masked[j] === "[") return j;
    }
    return -1;
  }

  if (masked[j] === "x") {

    return j - 1 >= 0 && masked[j - 1] === "\\" ? j - 1 : j;
  }
  return j;
}

function findAtomEnd(masked: string, start: number): number {
  if (start < 0 || start >= masked.length) return masked.length;
  if (masked[start] === "(") {
    let depth = 0;
    for (let j = start; j < masked.length; j++) {
      if (masked[j] === "(") depth++;
      else if (masked[j] === ")") {
        depth--;
        if (depth === 0) return j + 1;
      }
    }
    return masked.length;
  }

  if (masked[start] === "\\") return Math.min(start + 2, masked.length);
  if (masked[start] === "[") {
    let j = start + 1;
    while (j < masked.length && masked[j] !== "]") {
      j += masked[j] === "\\" ? 2 : 1;
    }
    return Math.min(j + 1, masked.length);
  }
  return Math.min(start + 1, masked.length);
}

function splitAlternatives(body: string): string[] | null {
  const parts: string[] = [];
  let depth = 0;
  let current = "";

  for (const ch of body) {
    if (ch === "\\") {
      current += ch;
      continue;
    }
    if (ch === "(" || ch === "[" || ch === "{") depth++;
    else if (ch === ")" || ch === "]" || ch === "}") depth--;

    if (ch === "|" && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  parts.push(current);

  return parts.some((p) => unbalanced(p)) ? null : parts;
}

function unbalanced(s: string): boolean {
  let depth = 0;
  for (const ch of s) {
    if (ch === "(" || ch === "[" || ch === "{") depth++;
    else if (ch === ")" || ch === "]" || ch === "}") depth--;
    if (depth < 0) return true;
  }
  return depth !== 0;
}

function alternationBranches(masked: string, atomStart: number): string[] | null {
  if (masked[atomStart] !== "(") return null;
  const atomEnd = findAtomEnd(masked, atomStart);
  const closing = atomEnd - 1;
  if (masked[closing] !== ")") return null;

  const body = masked.slice(atomStart + 1, closing);
  const parts = splitAlternatives(body);
  if (!parts || parts.length < 2) return null;
  return parts;
}

interface BranchRange {
  start: number;
  end: number;
}

function alternationBranchRanges(
  masked: string,
  atomStart: number
): BranchRange[] | null {
  const branches = alternationBranches(masked, atomStart);
  if (!branches) return null;

  const ranges: BranchRange[] = [];
  let cursor = atomStart + 1;
  for (const branch of branches) {
    ranges.push({ start: cursor, end: cursor + branch.length });
    cursor += branch.length + 1;
  }
  return ranges;
}

function sourceRange(
  map: number[],
  range: BranchRange
): { start: number; end: number } | null {
  const start = map[range.start];
  const last = map[range.end - 1];
  if (start === undefined || last === undefined) return null;
  return { start, end: last + 1 };
}

function branchText(
  source: string,
  masked: string,
  map: number[],
  range: BranchRange
): string {
  const original = sourceRange(map, range);
  if (!original) return masked.slice(range.start, range.end);
  return source.slice(original.start, original.end);
}

function branchAlphabet(
  source: string,
  masked: string,
  map: number[],
  range: BranchRange
): string | null {
  if (findAtomEnd(masked, range.start) !== range.end) return null;

  const original = sourceRange(map, range);
  if (!original) return null;

  return alphabetOfSource(source, original.start, original.end);
}

function branchesConflict(
  source: string,
  masked: string,
  map: number[],
  left: BranchRange,
  right: BranchRange,
  foldCase: boolean
): boolean {
  const leftText = branchText(source, masked, map, left).trim();
  const rightText = branchText(source, masked, map, right).trim();
  if (!leftText.length || !rightText.length) return false;

  const a = foldCase ? leftText.toLowerCase() : leftText;
  const b = foldCase ? rightText.toLowerCase() : rightText;

  if (a === b) return true;
  if (a.startsWith(b) || b.startsWith(a)) return true;

  const leftAlphabet = branchAlphabet(source, masked, map, left);
  const rightAlphabet = branchAlphabet(source, masked, map, right);
  if (leftAlphabet === null || rightAlphabet === null) return false;

  const leftLetters = foldCase ? leftAlphabet.toLowerCase() : leftAlphabet;
  const rightLetters = foldCase ? rightAlphabet.toLowerCase() : rightAlphabet;

  return leftLetters.split("").some((letter) => rightLetters.includes(letter));
}

function isSingleQuantifiedAtom(body: string): boolean {

  const trimmed = body.replace(/^[\^$]+|[\^$]+$/g, "");
  if (trimmed.length === 0) return false;

  const atomEnd = findAtomEnd(trimmed, 0);
  const q = readQuantifier(trimmed, atomEnd);
  if (!q || q.max !== Infinity) return false;

  return q.next >= trimmed.length;
}

function endsInQuantifiedAtom(body: string): boolean {
  const trimmed = body.replace(/^[\^$]+|[\^$]+$/g, "");
  if (trimmed.length === 0) return false;

  if (isSingleQuantifiedAtom(trimmed)) return true;

  if (trimmed[0] === "(") {
    const end = findAtomEnd(trimmed, 0);
    if (end > 1 && trimmed[end - 1] === ")") {
      return endsInQuantifiedAtom(trimmed.slice(1, end - 1));
    }
  }

  return false;
}

function startsWithRepeatedOptionals(body: string): boolean {
  const trimmed = body.replace(/^[\^$]+|[\^$]+$/g, "");
  if (trimmed.length === 0) return false;

  const firstEnd = findAtomEnd(trimmed, 0);
  const first = readQuantifier(trimmed, firstEnd);
  if (!first || (first.quant !== "+" && first.quant !== "*")) return false;

  let index = first.next;
  while (index < trimmed.length) {
    const itemEnd = findAtomEnd(trimmed, index);
    const item = readQuantifier(trimmed, itemEnd);
    if (!item || (item.quant !== "?" && item.quant !== "*")) return false;
    index = item.next;
  }

  return true;
}

const CLASS_ESCAPES: Record<string, string> = {
  d: "0123456789",
  w: "abcXYZ019_",
  s: " \t\n",
};

function alphabetOfSource(source: string, start: number, end: number): string | null {
  if (start < 0 || end > source.length || end <= start) return null;

  if (end - start === 1) return source[start];

  if (end - start === 2 && source[start] === "\\") {
    const letter = source[start + 1];
    return CLASS_ESCAPES[letter] ?? null;
  }

  if (source[start] === "[" && source[end - 1] === "]") {
    const body = source.slice(start + 1, end - 1);

    if (body.startsWith("^")) return null;

    const chars = new Set<string>();
    for (let i = 0; i < body.length; i++) {
      const ch = body[i];

      if (ch === "\\") {
        const letters = CLASS_ESCAPES[body[i + 1]];
        if (!letters) return null;
        for (const c of letters) chars.add(c);
        i++;
        continue;
      }

      if (ch === "-" && i > 0 && i + 1 < body.length) {
        const from = body[i - 1];
        const to = body[i + 1];
        if (from === "\\" || to === "\\") return null;
        chars.add(from);
        chars.add(to);
        i++;
        continue;
      }

      chars.add(ch);
    }

    return [...chars].join("");
  }

  return null;
}

export function analyzeReDoS(pattern: string, flags: string = ""): RedosFinding[] {
  if (!pattern) return [];

  if (pattern.length > MAX_REGEX_LENGTH) return [];

  const { masked, map } = maskClasses(pattern);
  const findings: RedosFinding[] = [];
  const seen = new Set<string>();

  const foldCase = flags.includes("i");

  const report = (
    rule: RedosFinding["rule"],
    index: number,
    end: number,
    message: string
  ) => {
    const key = `${rule}:${index}`;
    if (seen.has(key)) return;
    seen.add(key);
    findings.push({
      rule,
      message,
      index: map[index] ?? index,
      fragment: pattern.slice(map[index] ?? 0, (map[end - 1] ?? index) + 1),
    });
  };

  let i = 0;
  while (i < masked.length) {
    const q = readQuantifier(masked, i);
    if (!q) {
      i++;
      continue;
    }

    const atomStart = findAtomStart(masked, i);

    if (q.max === Infinity) {
      const branches = alternationBranchRanges(masked, atomStart);
      if (branches) {
        const conflict = branches.some((branch, index) =>
          branches
            .slice(index + 1)
            .some((other) =>
              branchesConflict(pattern, masked, map, branch, other, foldCase)
            )
        );

        if (conflict) {
          report(
            "duplicate-branch",
            atomStart,
            q.next,
            "Alternancia con ramas que pueden cubrir el mismo texto, cuantificada sin límite. Es el caso clásico de backtracking catastrófico (ReDoS)."
          );
        }
      }

      if (masked[atomStart] === "(") {
        const groupEnd = findAtomEnd(masked, atomStart);
        const body = masked.slice(atomStart + 1, groupEnd - 1);
        if (endsInQuantifiedAtom(body) || startsWithRepeatedOptionals(body)) {
          report(
            "nested-quantifier",
            atomStart,
            q.next,
            "Cuantificador anidado sobre un grupo que puede repetirse (p. ej. `(a+)+`). Riesgo de backtracking catastrófico (ReDoS)."
          );
        }
      }
    }

    if (q.max === Infinity && atomStart > 0) {
      const prevQ = readQuantifier(masked, atomStart - 1);
      if (prevQ && prevQ.max === Infinity) {
        const prevStart = findAtomStart(masked, atomStart - 1);

        const left = alphabetOfSource(
          pattern,
          map[prevStart] ?? prevStart,
          (map[findAtomEnd(masked, prevStart) - 1] ?? findAtomEnd(masked, prevStart) - 1) + 1
        );
        const right = alphabetOfSource(
          pattern,
          map[atomStart] ?? atomStart,
          (map[findAtomEnd(masked, atomStart) - 1] ?? findAtomEnd(masked, atomStart) - 1) + 1
        );
        if (left && right) {
          const overlap = left.split("").some((ch) => right.includes(ch));
          if (overlap) {
            report(
              "adjacent-overlapping-quantifiers",
              prevStart,
              q.next,
              "Dos cuantificadores sin límite seguidos que pueden consumir el mismo carácter (p. ej. `\\d+\\d+`). Puede producir backtracking exponencial (ReDoS)."
            );
          }
        }
      }
    }

    if (q.max !== Infinity && q.max > 1000 && q.max - q.min > 1000) {
      report(
        "large-counted-repetition",
        atomStart,
        q.next,
        `Repetición de hasta ${q.max} veces sobre un grupo. Puede tardar mucho en evaluarse.`
      );
    }

    i = q.next;
  }

  return findings;
}

export function isReDoSSafe(pattern: string, flags: string = ""): boolean {
  return analyzeReDoS(pattern, flags).length === 0;
}

export interface CompiledRegex {
  regex: RegExp;
  source: string;
  flags: string;
}

export type CompileResult =
  | { ok: true; value: CompiledRegex }
  | {
      ok: false;

      error: string | null;
      redos?: RedosFinding[];
    };

export function compileUserRegex(pattern: string, flags: string = ""): CompileResult {
  if (typeof pattern !== "string" || pattern.length === 0) {
    return { ok: false, error: "La regex es requerida" };
  }
  if (pattern.length > MAX_REGEX_LENGTH) {
    return {
      ok: false,
      error: `La regex supera el límite de ${MAX_REGEX_LENGTH} caracteres`,
    };
  }
  if (flags.length > 8 || [...flags].some((f) => !ALLOWED_FLAGS.includes(f))) {
    return { ok: false, error: `Flags inválidas. Permitidas: ${ALLOWED_FLAGS}` };
  }

  let regex: RegExp;
  try {
    regex = new RegExp(pattern, flags);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Regex inválida" };
  }

  const redos = analyzeReDoS(pattern, flags);
  if (redos.length > 0) {
    return { ok: false, error: redos[0].message, redos };
  }

  return { ok: true, value: { regex, source: pattern, flags } };
}

export interface ScannedMatch {
  start: number;
  end: number;
  fullMatch: string;
  groups: Record<string, string>;
}

export function scanMatches(
  regex: RegExp,
  input: string,
  options: { maxMatches?: number; deadlineMs?: number } = {}
): { matches: ScannedMatch[]; truncated: boolean } {
  const maxMatches = Math.min(options.maxMatches ?? MAX_MATCHES, MAX_MATCHES);
  const deadlineMs = options.deadlineMs ?? 200;

  const needsGlobal = regex.flags.includes("g") || regex.flags.includes("y");
  const re = needsGlobal
    ? new RegExp(regex.source, regex.flags)
    : new RegExp(regex.source, `${regex.flags}g`);

  const started = Date.now();
  const matches: ScannedMatch[] = [];
  let truncated = false;
  let guard = 0;

  let m: RegExpExecArray | null;
  while ((m = re.exec(input)) !== null) {
    const groups: Record<string, string> = {};
    if (m.groups) {
      for (const [key, value] of Object.entries(m.groups)) {
        groups[key] = value ?? "";
      }
    }
    matches.push({
      start: m.index,
      end: m.index + m[0].length,
      fullMatch: m[0],
      groups,
    });

    if (m.index === re.lastIndex) re.lastIndex++;

    if (++guard > MAX_SCAN_ITERATIONS || matches.length >= maxMatches) {
      truncated = true;
      break;
    }
    if (Date.now() - started > deadlineMs) {
      truncated = true;
      break;
    }
  }

  return { matches, truncated };
}