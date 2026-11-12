export type SupportedLanguage =
  | "javascript"
  | "python"
  | "go"
  | "rust"
  | "java"
  | "csharp"
  | "php"
  | "ruby";

export interface ExportResult {
  language: SupportedLanguage;
  code: string;
  importStatement?: string;
}

const LANGUAGE_CONFIG: Record<SupportedLanguage, {
  delimiter: string;
  escapeChars: RegExp;
  flagMapping: Record<string, string>;
  template: (pattern: string, flags: string) => string;
  importStatement?: string;
}> = {
  javascript: {
    delimiter: "/",
    escapeChars: /[/\\]/g,
    flagMapping: { g: "g", i: "i", m: "m", s: "s", u: "u", y: "y" },
    template: (pattern, flags) => `/${pattern}/${flags}`,
  },
  python: {
    delimiter: "r",
    escapeChars: /["\\]/g,
    flagMapping: { g: "", i: "re.IGNORECASE", m: "re.MULTILINE", s: "re.DOTALL", u: "re.UNICODE", y: "" },
    template: (pattern, flags) => {
      const pythonFlags = flags
        .split("")
        .map((f) => LANGUAGE_CONFIG.python.flagMapping[f])
        .filter(Boolean)
        .join(" | ");
      const flagPart = pythonFlags ? `, ${pythonFlags}` : "";
      return `re.compile(r"${pattern}"${flagPart})`;
    },
    importStatement: "import re",
  },
  go: {
    delimiter: "`",
    escapeChars: /[`\\]/g,
    flagMapping: { g: "", i: "(?i)", m: "(?m)", s: "(?s)", u: "", y: "" },
    template: (pattern, flags) => {
      const inlineFlags = flags
        .split("")
        .map((f) => LANGUAGE_CONFIG.go.flagMapping[f])
        .filter(Boolean)
        .join("");
      const flagPrefix = inlineFlags ? `(${inlineFlags})` : "";
      return `regexp.MustCompile(\`${flagPrefix}${pattern}\`)`;
    },
    importStatement: "import \"regexp\"",
  },
  rust: {
    delimiter: "r",
    escapeChars: /["\\]/g,
    flagMapping: { g: "", i: "(?i)", m: "(?m)", s: "(?s)", u: "", y: "" },
    template: (pattern, flags) => {
      const inlineFlags = flags
        .split("")
        .map((f) => LANGUAGE_CONFIG.rust.flagMapping[f])
        .filter(Boolean)
        .join("");
      const flagPrefix = inlineFlags ? `(${inlineFlags})` : "";
      return `regex::new(r#"${flagPrefix}${pattern}"#)`;
    },
    importStatement: "use regex::Regex;",
  },
  java: {
    delimiter: '"',
    escapeChars: /["\\]/g,
    flagMapping: { g: "", i: "Pattern.CASE_INSENSITIVE", m: "Pattern.MULTILINE", s: "Pattern.DOTALL", u: "Pattern.UNICODE_CHARACTER_CLASS", y: "" },
    template: (pattern, flags) => {
      const javaFlags = flags
        .split("")
        .map((f) => LANGUAGE_CONFIG.java.flagMapping[f])
        .filter(Boolean)
        .join(" | ");
      const flagPart = javaFlags ? `, ${javaFlags}` : "";
      return `Pattern.compile("${pattern}"${flagPart})`;
    },
    importStatement: "import java.util.regex.Pattern;",
  },
  csharp: {
    delimiter: '"',
    escapeChars: /["\\]/g,
    flagMapping: { g: "", i: "RegexOptions.IgnoreCase", m: "RegexOptions.Multiline", s: "RegexOptions.Singleline", u: "", y: "" },
    template: (pattern, flags) => {
      const csFlags = flags
        .split("")
        .map((f) => LANGUAGE_CONFIG.csharp.flagMapping[f])
        .filter(Boolean)
        .join(" | ");
      const flagPart = csFlags ? `, ${csFlags}` : "";
      return `new Regex("${pattern}"${flagPart})`;
    },
    importStatement: "using System.Text.RegularExpressions;",
  },
  php: {
    delimiter: "/",
    escapeChars: /[/\\]/g,
    flagMapping: { g: "", i: "i", m: "m", s: "s", u: "u", y: "" },
    template: (pattern, flags) => {
      const phpFlags = flags
        .split("")
        .map((f) => LANGUAGE_CONFIG.php.flagMapping[f])
        .filter(Boolean)
        .join("");
      return `"/${pattern}/${phpFlags}"`;
    },
  },
  ruby: {
    delimiter: "/",
    escapeChars: /[/\\]/g,
    flagMapping: { g: "", i: "i", m: "m", s: "m", u: "", y: "" },
    template: (pattern, flags) => {
      const rubyFlags = flags
        .split("")
        .map((f) => LANGUAGE_CONFIG.ruby.flagMapping[f])
        .filter(Boolean)
        .join("");
      return `/${pattern}/${rubyFlags}`;
    },
  },
};

export function exportRegex(pattern: string, flags: string, language: SupportedLanguage): ExportResult {
  const config = LANGUAGE_CONFIG[language];

  let escapedPattern = pattern;
  if (language !== "go" && language !== "rust") {

    escapedPattern = pattern.replace(/["\\]/g, "\\$&");
  }

  if (["javascript", "php", "ruby"].includes(language)) {
    escapedPattern = escapedPattern.replace(/\//g, "\\/");
  }

  if (language === "go" || language === "rust") {
    escapedPattern = escapedPattern.replace(/`/g, "` + \"`\" + `");
  }

  return {
    language,
    code: config.template(escapedPattern, flags),
    importStatement: config.importStatement,
  };
}

export function exportAllLanguages(pattern: string, flags: string): ExportResult[] {
  const languages: SupportedLanguage[] = [
    "javascript",
    "python",
    "go",
    "rust",
    "java",
    "csharp",
    "php",
    "ruby",
  ];
  return languages.map((lang) => exportRegex(pattern, flags, lang));
}

export function getLanguageDisplayName(language: SupportedLanguage): string {
  const names: Record<SupportedLanguage, string> = {
    javascript: "JavaScript / TypeScript",
    python: "Python",
    go: "Go",
    rust: "Rust",
    java: "Java",
    csharp: "C#",
    php: "PHP",
    ruby: "Ruby",
  };
  return names[language];
}