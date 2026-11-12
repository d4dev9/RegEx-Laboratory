import { describe, expect, it } from "vitest";
import { LANGS, explain, exportCode, isRisky } from "@/lib/regex/core";
import { analyzeReDoS } from "@/lib/regex/safety";

describe("explain", () => {
  it("returns nothing for an empty pattern", () => {
    expect(explain("")).toEqual([]);
  });

  it("describes a digit class in both languages", () => {
    const [t] = explain("\\d");
    expect(t.t).toBe("\\d");
    expect(t.es).toBe("Un dígito (0-9)");
    expect(t.en).toBe("A digit (0-9)");
  });

  it("names \\A and \\z as unavailable in JavaScript", () => {
    const [a] = explain("\\A");
    const [z] = explain("\\z");
    expect(a.es).toContain("no existe en JavaScript");
    expect(z.en).toContain("not available in JavaScript");
  });

  it("numbers capturing groups in source order", () => {
    const tokens = explain("(a)(b)");
    const groups = tokens.filter((t) => /Grupo de captura/.test(t.es));
    expect(groups.map((g) => g.es)).toEqual(["Grupo de captura n.º 1", "Grupo de captura n.º 2"]);
  });

  it("numbers named groups alongside plain ones", () => {
    const tokens = explain("(a)(?<year>\\d{4})");

    expect(tokens[3].es).toContain("«year»");
    expect(tokens[3].es).toContain("n.º 2");
  });

  it("tracks nesting depth", () => {
    const tokens = explain("(?:ab)");
    expect(tokens[0].depth).toBe(0);
    expect(tokens[1].depth).toBe(1);
    expect(tokens[2].depth).toBe(0);
  });

  it("reads a character class as one token", () => {
    const [c] = explain("[a-z]");
    expect(c.t).toBe("[a-z]");
    expect(c.es).toBe("Uno de estos caracteres: a-z");
  });

  it("explains a negated class", () => {
    const [c] = explain("[^abc]");
    expect(c.es).toBe("Cualquier carácter excepto: abc");
  });

  it("treats an unclosed class as a literal", () => {
    const [c] = explain("[abc");
    expect(c.t).toBe("[");
    expect(c.es).toContain("clase sin cerrar");
  });

  it("distinguishes the three counted quantifiers", () => {
    expect(explain("a{2}")[1].es).toBe("Exactamente 2 veces el elemento anterior");
    expect(explain("a{2,}")[1].es).toBe("2 o más veces el elemento anterior");
    expect(explain("a{2,4}")[1].es).toBe("Entre 2 y 4 veces el elemento anterior");
  });

  it("marks a lazy quantifier", () => {
    expect(explain("a+?")[1].es).toContain("perezoso");
    expect(explain("a+?")[1].en).toContain("lazy");
  });

  it("treats a malformed brace as a literal", () => {
    const tokens = explain("a{x}");
    const brace = tokens.find((t) => t.t === "{");
    expect(brace).toBeDefined();
    expect(brace!.es).toContain("Carácter literal");
  });

  it("reads a backreference by name and by number", () => {
    expect(explain("\\k<name>")[0].es).toContain("«name»");
    expect(explain("\\1")[0].es).toBe("Referencia al grupo 1");
  });

  it("reads Unicode escapes with and without braces", () => {
    expect(explain("\\u0041")[0].es).toBe("Carácter Unicode 0041");
    expect(explain("\\u{1F600}")[0].es).toBe("Carácter Unicode 1F600");
  });

  it("reads a hex escape", () => {
    expect(explain("\\x41")[0].es).toBe("Carácter con código hexadecimal 41");
  });

  it("reads Unicode property escapes in both directions", () => {
    expect(explain("\\p{L}")[0].es).toBe("Carácter con la propiedad Unicode L");
    expect(explain("\\P{L}")[0].es).toBe("Cualquier carácter que no tenga la propiedad Unicode L");
  });

  it("reads the four lookaround prefixes", () => {
    expect(explain("(?=a)")[0].t).toBe("(?=");
    expect(explain("(?!a)")[0].t).toBe("(?!");
    expect(explain("(?<=a)")[0].t).toBe("(?<=");
    expect(explain("(?<!a)")[0].t).toBe("(?<!");
  });

  it("collapses a run of literal characters into one token", () => {
    const tokens = explain("abc");
    expect(tokens).toHaveLength(1);
    expect(tokens[0].es).toBe("Texto literal «abc»");
  });

  it("reports a lone backslash", () => {
    const [c] = explain("\\");
    expect(c.t).toBe("\\");
    expect(c.es).toContain("sin carácter a escapar");
  });

  it("never loses source characters", () => {
    const src = "^(?<a>[a-z]{2,4}|[A-F]\\d+)(?:x|y)*?\\k<a>$";
    expect(explain(src).map((t) => t.t).join("")).toBe(src);
  });
});

describe("exportCode", () => {
  it("offers the eight languages", () => {
    expect(LANGS.map((l) => l[0])).toEqual([
      "javascript",
      "python",
      "go",
      "rust",
      "java",
      "csharp",
      "php",
      "ruby",
    ]);
  });

  it("returns a JavaScript literal that recompiles", () => {
    const { code } = exportCode("javascript", "a\\.b", "gi");
    const literalLine = code.split("\n")[0].replace(/^const regex = /, "").replace(/;$/, "");

    const re = new RegExp(literalLine.slice(1, -3), literalLine.slice(-2));
    expect(re.source).toBe("a\\.b");
    expect(re.flags).toBe("gi");
    expect(re.test("a.b")).toBe(true);
  });

  it("escapes a slash inside a literal", () => {
    expect(exportCode("javascript", "a/b", "").code).toContain("/a\\/b/");
  });

  it("uses matchAll with g and match without it", () => {
    expect(exportCode("javascript", "a", "g").code).toContain("matchAll");
    expect(exportCode("javascript", "a", "").code).toContain("text.match(");
  });

  it("maps the JavaScript flags onto Python constants", () => {
    const { code } = exportCode("python", "a", "gims");
    expect(code).toContain("import re");
    expect(code).toContain("re.IGNORECASE");
    expect(code).toContain("re.MULTILINE");
    expect(code).toContain("re.DOTALL");
    expect(code).toContain("finditer");
  });

  it("emits no flag argument for Python when there are no flags", () => {
    expect(exportCode("python", "a", "").code).toContain('re.compile(r"a")');
  });

  it("rewrites named groups to Python syntax", () => {
    expect(exportCode("python", "(?<y>\\d{4})", "").code).toContain("(?P<y>");
  });

  it("uses an inline flag group for Go and Rust", () => {
    expect(exportCode("go", "a", "ims").code).toContain('(?ims)a');
    expect(exportCode("rust", "a", "i").code).toContain('(?i)a');
  });

  it("warns that Go and Rust lack lookarounds", () => {
    expect(exportCode("go", "(?=a)b", "").notes).toContain("look");
    expect(exportCode("rust", "(?<=a)b", "").notes).toContain("look");
  });

  it("warns about a backreference in Go too", () => {
    expect(exportCode("go", "(a)\\1", "").notes).toContain("look");
  });

  it("maps the flags onto Java constants", () => {
    const { code } = exportCode("java", "a", "gimsu");
    expect(code).toContain("Pattern.CASE_INSENSITIVE");
    expect(code).toContain("Pattern.MULTILINE");
    expect(code).toContain("Pattern.DOTALL");
    expect(code).toContain("Pattern.UNICODE_CASE");
    expect(code).toContain("while (matcher.find())");
  });

  it("maps the flags onto C# options", () => {
    const { code } = exportCode("csharp", "a", "gims");
    expect(code).toContain("RegexOptions.IgnoreCase");
    expect(code).toContain("RegexOptions.Multiline");
    expect(code).toContain("RegexOptions.Singleline");

    expect(code).toContain("regex.Matches(");
    expect(exportCode("csharp", "a", "i").code).toContain("regex.Match(text)");
  });

  it("switches the PHP function with the g flag", () => {
    expect(exportCode("php", "a", "g").code).toContain("preg_match_all(");
    expect(exportCode("php", "a", "").code).toContain("preg_match(");
    expect(exportCode("php", "a", "ims").code).toContain("'/a/ims'");
  });

  it("emits a warning that Ruby already has per-line anchors", () => {
    expect(exportCode("ruby", "a", "m").notes).toContain("rubyM");
  });

  it("does not warn about sticky for JavaScript", () => {
    expect(exportCode("javascript", "a", "y").notes).not.toContain("sticky");
  });

  it("warns that sticky has no equivalent elsewhere", () => {
    for (const [lang] of LANGS) {
      if (lang === "javascript") continue;
      expect(exportCode(lang, "a", "y").notes).toContain("sticky");
    }
  });

  it("survives a pattern containing every quote character", () => {
    const { code } = exportCode("python", "[\"'`]", "");
    expect(code).toContain("import re");
  });
});

describe("isRisky", () => {
  it("flags a nested quantifier over a single quantified atom", () => {
    expect(isRisky("(a+)+")).toBe(true);
    expect(isRisky("(.*)*")).toBe(true);
  });

  it("flags a quantified first item followed by optional ones", () => {
    expect(isRisky("(\\w+\\s?)+")).toBe(true);
  });

  it("accepts a group that starts with a literal delimiter", () => {
    expect(isRisky("(?:\\.[\\w-]+)+")).toBe(false);
  });

  it("accepts bounded repetition", () => {
    expect(isRisky("^(?:(?:25[0-5]|2[0-4]\\d)\\.){3}")).toBe(false);
  });

  it("accepts fixed-width alternation", () => {
    expect(isRisky("^#(?:[A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$")).toBe(false);
  });

  it("accepts a mandatory separator between repetitions", () => {
    expect(isRisky("^[a-z0-9]+(?:-[a-z0-9]+)*$")).toBe(false);
  });

  it("accepts independent lookaheads", () => {
    expect(isRisky("^(?=.*[a-z])(?=.*[A-Z])\\w{8,}$")).toBe(false);
  });

  it("does not flag a quantified alternation", () => {
    expect(isRisky("^(?:cat|dog)+$")).toBe(false);
  });

  it("does not flag a lookahead body", () => {
    expect(isRisky("(?=(\\w+)\\s)")).toBe(false);
  });

  it("agrees with the analyser the server uses", () => {
    /*
     * The client runs the pattern and the server stores it. If the two
     * disagreed, a pattern could be published that the browser then refuses
     * to run.
     */
    const patterns = [
      "(a+)+",
      "(\\w+\\s?)+",
      "^([a-z]|a)+$",
      "^(\\d|1)+$",
      "^(a|ab)+$",
      "^([a-z]|[0-9])+$",
      "^(?:https?|ftp)+$",
      "^(?:cat|dog)+$",
      "^[a-z0-9]+(?:-[a-z0-9]+)*$",
    ];

    for (const pattern of patterns) {
      expect(isRisky(pattern)).toBe(analyzeReDoS(pattern).length > 0);
    }
  });

  it("accepts an empty pattern", () => {
    expect(isRisky("")).toBe(false);
  });

  it("flags a pattern that only becomes catastrophic with the flag", () => {
    expect(isRisky("^(a|A)+$", "i")).toBe(true);
    expect(isRisky("^(a|A)+$", "")).toBe(false);
  });

  it("flags a quantifier inside a nested group", () => {
    expect(isRisky("^((a+))+$")).toBe(true);
  });
});
