export interface Token {
  type: TokenType;
  value: string;
  start: number;
  end: number;
  description: string;
  descriptionEn: string;
  quantifier?: string;
}

export type TokenType =
  | "anchor"
  | "quantifier"
  | "charClass"
  | "charClassRange"
  | "charClassNegation"
  | "escape"
  | "group"
  | "groupNonCapturing"
  | "groupNamed"
  | "groupLookahead"
  | "groupLookbehind"
  | "alternation"
  | "dot"
  | "literal"
  | "boundary"
  | "backreference"
  | "flag"
  | "unknown";

const TOKEN_DESCRIPTIONS: Record<string, { es: string; en: string }> = {
  "^": { es: "Inicio de línea/string", en: "Start of line/string" },
  "$": { es: "Fin de línea/string", en: "End of line/string" },
  "\\A": { es: "Inicio absoluto del string", en: "Absolute start of string" },
  "\\z": { es: "Fin absoluto del string", en: "Absolute end of string" },
  "\\Z": { es: "Fin del string (antes de \\n final)", en: "End of string (before final \\n)" },
  "\\b": { es: "Límite de palabra", en: "Word boundary" },
  "\\B": { es: "No límite de palabra", en: "Non-word boundary" },
  ".": { es: "Cualquier carácter (excepto salto de línea)", en: "Any character (except newline)" },
  "\\d": { es: "Dígito [0-9]", en: "Digit [0-9]" },
  "\\D": { es: "No dígito [^0-9]", en: "Non-digit [^0-9]" },
  "\\w": { es: "Carácter de palabra [a-zA-Z0-9_]", en: "Word character [a-zA-Z0-9_]" },
  "\\W": { es: "No carácter de palabra [^a-zA-Z0-9_]", en: "Non-word character [^a-zA-Z0-9_]" },
  "\\s": { es: "Espacio en blanco [\\t\\n\\r\\f]", en: "Whitespace [\\t\\n\\r\\f]" },
  "\\S": { es: "No espacio en blanco", en: "Non-whitespace" },
  "|": { es: "Alternancia (OR)", en: "Alternation (OR)" },
  "*": { es: "Cero o más (codicioso)", en: "Zero or more (greedy)" },
  "+": { es: "Uno o más (codicioso)", en: "One or more (greedy)" },
  "?": { es: "Cero o uno (codicioso)", en: "Zero or one (greedy)" },
  "*?": { es: "Cero o más (perezoso)", en: "Zero or more (lazy)" },
  "+?": { es: "Uno o más (perezoso)", en: "One or more (lazy)" },
  "??": { es: "Cero o uno (perezoso)", en: "Zero or one (lazy)" },
  "{": { es: "Cuantificador exacto/rango", en: "Exact/range quantifier" },
  "(": { es: "Grupo capturador", en: "Capturing group" },
  "(?:": { es: "Grupo no capturador", en: "Non-capturing group" },
  "(?<": { es: "Grupo nombrado", en: "Named group" },
  "(?=": { es: "Lookahead positivo", en: "Positive lookahead" },
  "(?!": { es: "Lookahead negativo", en: "Negative lookahead" },
  "(?<=": { es: "Lookbehind positivo", en: "Positive lookbehind" },
  "(?<!": { es: "Lookbehind negativo", en: "Negative lookbehind" },
  "[": { es: "Clase de caracteres", en: "Character class" },
  "[^": { es: "Clase de caracteres negada", en: "Negated character class" },
  "]": { es: "Fin de clase de caracteres", en: "End of character class" },
  "\\": { es: "Escape", en: "Escape" },
};

export function tokenize(pattern: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < pattern.length) {
    const char = pattern[i];

    if (char === "^" || char === "$") {
      tokens.push(createToken("anchor", char, i, i + 1));
      i++;
      continue;
    }

    if (char === "\\" && i + 1 < pattern.length) {
      const next = pattern[i + 1];
      const escaped = "\\" + next;

      if (["b", "B", "A", "z", "Z"].includes(next)) {
        tokens.push(createToken("boundary", escaped, i, i + 2));
        i += 2;
        continue;
      }

      if (["d", "D", "w", "W", "s", "S"].includes(next)) {
        tokens.push(createToken("escape", escaped, i, i + 2));
        i += 2;
        continue;
      }

      tokens.push(createToken("escape", escaped, i, i + 2));
      i += 2;
      continue;
    }

    if (["*", "+", "?"].includes(char)) {
      let quant = char;
      if (i + 1 < pattern.length && pattern[i + 1] === "?") {
        quant += "?";
        i++;
      }
      tokens.push(createToken("quantifier", quant, i - quant.length + 1, i + 1));
      i++;
      continue;
    }

    if (char === "{") {
      let j = i + 1;
      while (j < pattern.length && pattern[j] !== "}") j++;
      if (j < pattern.length) {
        const quant = pattern.slice(i, j + 1);
        tokens.push(createToken("quantifier", quant, i, j + 1));
        i = j + 1;
        continue;
      }
    }

    if (char === "(") {
      if (i + 2 < pattern.length) {
        const three = pattern.slice(i, i + 3);
        if (three === "(?:") {
          tokens.push(createToken("groupNonCapturing", three, i, i + 3));
          i += 3;
          continue;
        }
        if (three === "(?<") {
          let j = i + 3;
          while (j < pattern.length && pattern[j] !== ">") j++;
          if (j < pattern.length) {
            const named = pattern.slice(i, j + 1);
            tokens.push(createToken("groupNamed", named, i, j + 1));
            i = j + 1;
            continue;
          }
        }
        if (three === "(?=") {
          tokens.push(createToken("groupLookahead", three, i, i + 3));
          i += 3;
          continue;
        }
        if (three === "(?!") {
          tokens.push(createToken("groupLookahead", three, i, i + 3));
          i += 3;
          continue;
        }
        if (i + 3 < pattern.length) {
          const four = pattern.slice(i, i + 4);
          if (four === "(?<=") {
            tokens.push(createToken("groupLookbehind", four, i, i + 4));
            i += 4;
            continue;
          }
          if (four === "(?<!") {
            tokens.push(createToken("groupLookbehind", four, i, i + 4));
            i += 4;
            continue;
          }
        }
      }
      tokens.push(createToken("group", "(", i, i + 1));
      i++;
      continue;
    }

    if (char === ")") {
      tokens.push(createToken("group", ")", i, i + 1));
      i++;
      continue;
    }

    if (char === "|") {
      tokens.push(createToken("alternation", "|", i, i + 1));
      i++;
      continue;
    }

    if (char === "[") {
      if (i + 1 < pattern.length && pattern[i + 1] === "^") {
        tokens.push(createToken("charClassNegation", "[^", i, i + 2));
        i += 2;
        continue;
      }
      tokens.push(createToken("charClass", "[", i, i + 1));
      i++;
      continue;
    }

    if (char === "]") {
      tokens.push(createToken("charClass", "]", i, i + 1));
      i++;
      continue;
    }

    if (char === "-" && i > 0 && i + 1 < pattern.length) {

      tokens.push(createToken("charClassRange", "-", i, i + 1));
      i++;
      continue;
    }

    if (char === ".") {
      tokens.push(createToken("dot", ".", i, i + 1));
      i++;
      continue;
    }

    if (char === "\\" && i + 1 < pattern.length && /[1-9]/.test(pattern[i + 1])) {
      const ref = "\\" + pattern[i + 1];
      tokens.push(createToken("backreference", ref, i, i + 2));
      i += 2;
      continue;
    }

    tokens.push(createToken("literal", char, i, i + 1));
    i++;
  }

  return tokens;
}

function createToken(type: TokenType, value: string, start: number, end: number): Token {
  const desc = TOKEN_DESCRIPTIONS[value] || { es: value, en: value };
  return {
    type,
    value,
    start,
    end,
    description: desc.es,
    descriptionEn: desc.en,
  };
}

export function getTokenDescription(token: Token): string {
  return token.description;
}