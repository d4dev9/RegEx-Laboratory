import { analyzeReDoS } from "@/lib/regex/safety";

export type Lang = "es" | "en";

export interface ExplainedToken {

  t: string;
  es: string;
  en: string;

  depth: number;
}

const ESC: Record<string, readonly [es: string, en: string]> = {
  d: ["Un dígito (0-9)", "A digit (0-9)"],
  D: ["Cualquier carácter que no sea un dígito", "Any character that is not a digit"],
  w: ["Carácter de palabra: letra, dígito o guion bajo", "Word character: letter, digit or underscore"],
  W: ["Cualquier carácter que no sea de palabra", "Any character that is not a word character"],
  s: ["Espacio en blanco: espacio, tabulación o salto de línea", "Whitespace: space, tab or line break"],
  S: ["Cualquier carácter que no sea espacio en blanco", "Any character that is not whitespace"],
  b: ["Límite de palabra", "Word boundary"],
  B: ["Posición que no es un límite de palabra", "Position that is not a word boundary"],
  A: ["Inicio absoluto del texto (no existe en JavaScript)", "Absolute start of the text (not available in JavaScript)"],
  z: ["Fin absoluto del texto (no existe en JavaScript)", "Absolute end of the text (not available in JavaScript)"],
  Z: ["Fin del texto (no existe en JavaScript)", "End of the text (not available in JavaScript)"],
  n: ["Salto de línea", "Line break"],
  r: ["Retorno de carro", "Carriage return"],
  t: ["Tabulación", "Tab"],
  f: ["Salto de página", "Form feed"],
  v: ["Tabulación vertical", "Vertical tab"],
  0: ["Carácter nulo", "Null character"],
};

const GROUPS: readonly (readonly [string, string, string])[] = [
  ["(?:", "Grupo sin captura", "Non-capturing group"],
  ["(?=", "Lookahead positivo: lo siguiente debe coincidir, sin consumirlo", "Positive lookahead: what follows must match, without consuming it"],
  ["(?!", "Lookahead negativo: lo siguiente no debe coincidir", "Negative lookahead: what follows must not match"],
  ["(?<=", "Lookbehind positivo: lo anterior debe coincidir", "Positive lookbehind: what precedes must match"],
  ["(?<!", "Lookbehind negativo: lo anterior no debe coincidir", "Negative lookbehind: what precedes must not match"],
];

function push(out: ExplainedToken[], t: string, es: string, en: string, depth: number): void {
  out.push({ t, es, en, depth });
}

function quantAt(src: string, k: number): boolean {
  const ch = src[k];
  if (ch === "*" || ch === "+" || ch === "?") return true;
  if (ch === "{") return /^\{\d+(,\d*)?\}/.test(src.slice(k));
  return false;
}

const SPECIAL = "\\[](){}|^$.*+?";

function plain(ch: string): boolean {
  return SPECIAL.indexOf(ch) === -1;
}

export function explain(src: string): ExplainedToken[] {
  const out: ExplainedToken[] = [];
  let i = 0;
  const n = src.length;
  let depth = 0;
  let groupN = 0;
  let m: RegExpExecArray | null;

  while (i < n) {
    const c = src[i];
    const rest = src.slice(i);

    if (c === "\\") {
      const nx = src[i + 1];
      if (nx === undefined) {
        push(out, "\\", "Barra invertida sin carácter a escapar", "Backslash with nothing to escape", depth);
        i++;
        continue;
      }
      if ((m = /^\\k<([^>]+)>/.exec(rest))) {
        push(
          out,
          m[0],
          "Referencia al grupo «" + m[1] + "»",
          "Backreference to group “" + m[1] + "”",
          depth
        );
        i += m[0].length;
        continue;
      }
      if ((m = /^\\(?:u[0-9a-fA-F]{4}|u\{[0-9a-fA-F]+\})/.exec(rest))) {
        const code = m[0].slice(2).replace(/[{}]/g, "");
        push(out, m[0], "Carácter Unicode " + code, "Unicode character " + code, depth);
        i += m[0].length;
        continue;
      }
      if ((m = /^\\x[0-9a-fA-F]{2}/.exec(rest))) {
        const code = m[0].slice(2);
        push(out, m[0], "Carácter con código hexadecimal " + code, "Character with hexadecimal code " + code, depth);
        i += m[0].length;
        continue;
      }
      if ((m = /^\\([pP])\{([^}]+)\}/.exec(rest))) {
        const neg = m[1] === "P";
        push(
          out,
          m[0],
          (neg ? "Cualquier carácter que no tenga la propiedad Unicode " : "Carácter con la propiedad Unicode ") + m[2],
          (neg ? "Any character without the Unicode property " : "Character with the Unicode property ") + m[2],
          depth
        );
        i += m[0].length;
        continue;
      }
      if ((m = /^\\([1-9]\d*)/.exec(rest))) {
        push(out, m[0], "Referencia al grupo " + m[1], "Backreference to group " + m[1], depth);
        i += m[0].length;
        continue;
      }
      if (ESC[nx]) {
        push(out, "\\" + nx, ESC[nx][0], ESC[nx][1], depth);
      } else {
        push(out, "\\" + nx, "Carácter literal «" + nx + "»", "Literal character “" + nx + "”", depth);
      }
      i += 2;
      continue;
    }

    if (c === "[") {
      let j = i + 1;
      if (src[j] === "^") j++;
      while (j < n && src[j] !== "]") {
        if (src[j] === "\\") j++;
        j++;
      }
      if (j >= n) {
        push(out, "[", "Carácter literal «[» (clase sin cerrar)", "Literal character “[” (unclosed class)", depth);
        i++;
        continue;
      }
      const body = src.slice(i + 1, j);
      const negated = body[0] === "^";
      const inner = negated ? body.slice(1) : body;
      const tok = src.slice(i, j + 1);
      if (inner === "") {
        if (negated) {
          push(out, tok, "Cualquier carácter, incluidos los saltos de línea", "Any character, including line breaks", depth);
        } else {
          push(out, tok, "Clase vacía: no coincide con nada", "Empty class: matches nothing", depth);
        }
      } else if (negated) {
        push(out, tok, "Cualquier carácter excepto: " + inner, "Any character except: " + inner, depth);
      } else {
        push(out, tok, "Uno de estos caracteres: " + inner, "One of these characters: " + inner, depth);
      }
      i = j + 1;
      continue;
    }

    if (c === "(") {
      let matched = false;
      for (let g = 0; g < GROUPS.length; g++) {
        if (rest.indexOf(GROUPS[g][0]) === 0) {
          push(out, GROUPS[g][0], GROUPS[g][1], GROUPS[g][2], depth);
          depth++;
          i += GROUPS[g][0].length;
          matched = true;
          break;
        }
      }
      if (matched) continue;
      if ((m = /^\(\?<([A-Za-z_$][\w$]*)>/.exec(rest))) {
        groupN++;
        push(
          out,
          m[0],
          "Grupo de captura con nombre «" + m[1] + "» (n.º " + groupN + ")",
          "Named capturing group “" + m[1] + "” (#" + groupN + ")",
          depth
        );
        depth++;
        i += m[0].length;
        continue;
      }
      groupN++;
      push(out, "(", "Grupo de captura n.º " + groupN, "Capturing group #" + groupN, depth);
      depth++;
      i++;
      continue;
    }

    if (c === ")") {
      depth = Math.max(0, depth - 1);
      push(out, ")", "Cierra el grupo", "Closes the group", depth);
      i++;
      continue;
    }

    if (c === "|") {
      push(out, "|", "Alternancia: coincide con lo anterior o con lo siguiente", "Alternation: matches what precedes or what follows", depth);
      i++;
      continue;
    }

    if (c === "^") {
      push(out, "^", "Inicio del texto, o de cada línea con el flag m", "Start of the text, or of each line with the m flag", depth);
      i++;
      continue;
    }

    if (c === "$") {
      push(out, "$", "Fin del texto, o de cada línea con el flag m", "End of the text, or of each line with the m flag", depth);
      i++;
      continue;
    }

    if (c === ".") {
      push(out, ".", "Cualquier carácter excepto salto de línea; con el flag s los incluye", "Any character except a line break; with the s flag it includes them", depth);
      i++;
      continue;
    }

    if (c === "*" || c === "+" || c === "?" || c === "{") {
      let len = 1;
      let es: string;
      let en: string;
      if (c === "{") {
        m = /^\{(\d+)(,(\d*))?\}/.exec(rest);
        if (!m) {
          push(out, "{", "Carácter literal «{»", "Literal character “{”", depth);
          i++;
          continue;
        }
        len = m[0].length;
        if (m[2] === undefined) {
          es = "Exactamente " + m[1] + " veces el elemento anterior";
          en = "Exactly " + m[1] + " times the previous element";
        } else if (m[3] === "") {
          es = m[1] + " o más veces el elemento anterior";
          en = m[1] + " or more times the previous element";
        } else {
          es = "Entre " + m[1] + " y " + m[3] + " veces el elemento anterior";
          en = "Between " + m[1] + " and " + m[3] + " times the previous element";
        }
      } else if (c === "*") {
        es = "Cero o más veces el elemento anterior";
        en = "Zero or more times the previous element";
      } else if (c === "+") {
        es = "Una o más veces el elemento anterior";
        en = "One or more times the previous element";
      } else {
        es = "Cero o una vez el elemento anterior (opcional)";
        en = "Zero or one time the previous element (optional)";
      }
      const lazy = src[i + len] === "?";
      if (lazy) {
        es += "; perezoso, lo más corto posible";
        en += "; lazy, as few as possible";
      }
      push(out, src.slice(i, i + len + (lazy ? 1 : 0)), es, en, depth);
      i += len + (lazy ? 1 : 0);
      continue;
    }

    if (c === "]" || c === "}") {
      push(out, c, "Carácter literal «" + c + "»", "Literal character “" + c + "”", depth);
      i++;
      continue;
    }

    let k = i + 1;
    if (!quantAt(src, i + 1)) {
      while (k < n && plain(src[k]) && !quantAt(src, k + 1)) k++;
    }
    const text = src.slice(i, k);
    if (text.length === 1) {
      push(out, text, "Carácter literal «" + text + "»", "Literal character “" + text + "”", depth);
    } else {
      push(out, text, "Texto literal «" + text + "»", "Literal text “" + text + "”", depth);
    }
    i = k;
  }

  return out;
}

export type ExportLang =
  | "javascript"
  | "python"
  | "go"
  | "rust"
  | "java"
  | "csharp"
  | "php"
  | "ruby";

export const LANGS: readonly (readonly [ExportLang, string])[] = [
  ["javascript", "JavaScript"],
  ["python", "Python"],
  ["go", "Go"],
  ["rust", "Rust"],
  ["java", "Java"],
  ["csharp", "C#"],
  ["php", "PHP"],
  ["ruby", "Ruby"],
];

export interface ExportResult {
  code: string;

  notes: NoteKey[];
}

export type NoteKey = "look" | "sticky" | "rubyM";

function hasLookaround(p: string): boolean {
  return /\(\?<?[=!]/.test(p) || /\\[1-9]|\\k</.test(p);
}

function escSlash(p: string): string {
  return p.replace(/\\[\s\S]|\//g, (x) => (x === "/" ? "\\/" : x));
}

function namedP(p: string): string {
  return p
    .replace(/\(\?<(?![=!])([A-Za-z_]\w*)>/g, "(?P<$1>")
    .replace(/\\k<([^>]+)>/g, "(?P=$1)");
}

function pyStr(p: string): string {
  if (p.indexOf('"') === -1) return 'r"' + p + '"';
  if (p.indexOf("'") === -1) return "r'" + p + "'";
  return 'r"""' + p + '"""';
}

function goStr(p: string): string {
  if (p.indexOf("`") === -1) return "`" + p + "`";
  return '"' + p.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}

function rustStr(p: string): string {
  let h = "#";
  while (p.indexOf('"' + h) !== -1) h += "#";
  return "r" + h + '"' + p + '"' + h;
}

function javaStr(p: string): string {
  return '"' + p.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}

function csStr(p: string): string {
  return '@"' + p.replace(/"/g, '""') + '"';
}

function phpStr(p: string): string {
  return "'" + p.replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
}

function inlineFlags(p: string, fi: boolean, fm: boolean, fs: boolean): string {
  const s = (fi ? "i" : "") + (fm ? "m" : "") + (fs ? "s" : "");
  return s ? "(?" + s + ")" : "";
}

export function exportCode(lang: ExportLang, pattern: string, flags: string): ExportResult {
  const p = pattern ?? "";
  const f = flags ?? "";
  const g = f.indexOf("g") >= 0;
  const fi = f.indexOf("i") >= 0;
  const fm = f.indexOf("m") >= 0;
  const fs = f.indexOf("s") >= 0;
  const fu = f.indexOf("u") >= 0;
  const fy = f.indexOf("y") >= 0;
  const notes: NoteKey[] = [];
  let code = "";
  let parts: string[];

  if (fy && lang !== "javascript") notes.push("sticky");

  switch (lang) {
    case "javascript":
      code =
        "const regex = /" +
        escSlash(p || "(?:)") +
        "/" +
        f +
        ";\n" +
        (g ? "const matches = [...text.matchAll(regex)];" : "const match = text.match(regex);");
      break;

    case "python":
      parts = [];
      if (fi) parts.push("re.IGNORECASE");
      if (fm) parts.push("re.MULTILINE");
      if (fs) parts.push("re.DOTALL");
      code =
        "import re\n\npattern = re.compile(" +
        pyStr(namedP(p)) +
        (parts.length ? ", " + parts.join(" | ") : "") +
        ")\n" +
        (g
          ? "matches = [m.group() for m in pattern.finditer(text)]"
          : "match = pattern.search(text)");
      break;

    case "go":
      code =
        'import "regexp"\n\nre := regexp.MustCompile(' +
        goStr(inlineFlags(p, fi, fm, fs) + namedP(p)) +
        ")\n" +
        (g ? "matches := re.FindAllString(text, -1)" : "match := re.FindString(text)");
      if (hasLookaround(p)) notes.push("look");
      break;

    case "rust":
      code =
        "use regex::Regex;\n\nlet re = Regex::new(" +
        rustStr(inlineFlags(p, fi, fm, fs) + namedP(p)) +
        ").unwrap();\n" +
        (g
          ? "let matches: Vec<&str> = re.find_iter(text).map(|m| m.as_str()).collect();"
          : "let found = re.find(text);");
      if (hasLookaround(p)) notes.push("look");
      break;

    case "java":
      parts = [];
      if (fi) parts.push("Pattern.CASE_INSENSITIVE");
      if (fm) parts.push("Pattern.MULTILINE");
      if (fs) parts.push("Pattern.DOTALL");
      if (fu) parts.push("Pattern.UNICODE_CASE");
      code =
        "import java.util.regex.*;\n\nPattern pattern = Pattern.compile(" +
        javaStr(p) +
        (parts.length ? ", " + parts.join(" | ") : "") +
        ");\n" +
        "Matcher matcher = pattern.matcher(text);\n" +
        (g
          ? "while (matcher.find()) {\n    System.out.println(matcher.group());\n}"
          : "if (matcher.find()) {\n    System.out.println(matcher.group());\n}");
      break;

    case "csharp":
      parts = [];
      if (fi) parts.push("RegexOptions.IgnoreCase");
      if (fm) parts.push("RegexOptions.Multiline");
      if (fs) parts.push("RegexOptions.Singleline");
      code =
        "using System.Text.RegularExpressions;\n\nvar regex = new Regex(" +
        csStr(p) +
        (parts.length ? ", " + parts.join(" | ") : "") +
        ");\n" +
        (g ? "var matches = regex.Matches(text);" : "var match = regex.Match(text);");
      break;

    case "php":
      code =
        "<?php\n" +
        (g ? "preg_match_all(" : "preg_match(") +
        phpStr(
          "/" +
            escSlash(p) +
            "/" +
            (fi ? "i" : "") +
            (fm ? "m" : "") +
            (fs ? "s" : "") +
            (fu ? "u" : "")
        ) +
        ", $text, $matches);";
      break;

    case "ruby":
      code =
        "regex = /" +
        escSlash(p || "(?:)") +
        "/" +
        (fi ? "i" : "") +
        (fs ? "m" : "") +
        "\n" +
        (g ? "matches = text.scan(regex)" : "match = text.match(regex)");
      if (fm) notes.push("rubyM");
      break;
  }

  return { code, notes };
}

export function isRisky(src: string, flags: string = ""): boolean {
  return analyzeReDoS(src, flags).length > 0;
}
