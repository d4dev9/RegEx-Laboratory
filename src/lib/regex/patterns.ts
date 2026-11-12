import type { Lang } from "./core";

export interface Localized {
  es: string;
  en: string;
}

export type PatternCategory =
  | "validation"
  | "network"
  | "identifiers"
  | "dates"
  | "payments"
  | "web"
  | "security"
  | "spain"
  | "identity"
  | "phone"
  | "css"
  | "json"
  | "encoding"
  | "html"
  | "markdown"
  | "git"
  | "versioning";

export const CATEGORIES: Record<PatternCategory, Localized> = {
  validation: { es: "validación", en: "validation" },
  network: { es: "red", en: "network" },
  identifiers: { es: "identificadores", en: "identifiers" },
  dates: { es: "fechas", en: "dates" },
  payments: { es: "pagos", en: "payments" },
  web: { es: "web", en: "web" },
  security: { es: "seguridad", en: "security" },
  spain: { es: "españa", en: "spain" },
  identity: { es: "identidad", en: "identity" },
  phone: { es: "teléfono", en: "phone" },
  css: { es: "css", en: "css" },
  json: { es: "json", en: "json" },
  encoding: { es: "encoding", en: "encoding" },
  html: { es: "html", en: "html" },
  markdown: { es: "markdown", en: "markdown" },
  git: { es: "git", en: "git" },
  versioning: { es: "versionado", en: "versioning" },
};

export interface LibraryPattern {
  id: string;
  name: Localized;
  cat: PatternCategory;
  flags: string;

  featured?: boolean;
  regex: string;

  description: Localized;

  example: string;
}

function n(es: string, en: string): Localized {
  return { es, en };
}

export const PATTERNS: LibraryPattern[] = [
  {
    id: "email",
    name: n("Email", "Email"),
    cat: "validation",
    flags: "i",
    featured: true,
    regex: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
    description: n(
      "Valida direcciones de email estándar (RFC 5322 simplificado).",
      "Validates standard email addresses (simplified RFC 5322)."
    ),
    example: "soporte@ejemplo.com",
  },
  {
    id: "url",
    name: n("URL (HTTP/HTTPS)", "URL (HTTP/HTTPS)"),
    cat: "validation",
    flags: "i",
    featured: true,
    regex: "^https?:\\/\\/(?:www\\.)?[\\w-]+(?:\\.[\\w-]+)+[\\w./?#&=%-]*$",
    description: n(
      "Valida URLs con protocolo http o https.",
      "Validates URLs with the http or https protocol."
    ),
    example: "https://ejemplo.com/docs?page=2",
  },
  {
    id: "ipv4",
    name: n("IPv4", "IPv4"),
    cat: "network",
    flags: "",
    featured: true,
    regex: "^(?:(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)$",
    description: n(
      "Dirección IPv4 (0.0.0.0 - 255.255.255.255).",
      "IPv4 address (0.0.0.0 - 255.255.255.255)."
    ),
    example: "192.168.1.1",
  },
  {
    id: "uuid",
    name: n("UUID v4", "UUID v4"),
    cat: "identifiers",
    flags: "i",
    featured: true,
    regex: "^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
    description: n(
      "Identificador único universal versión 4.",
      "Universally unique identifier, version 4."
    ),
    example: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  },
  {
    id: "iso8601",
    name: n("ISO 8601", "ISO 8601"),
    cat: "dates",
    flags: "",
    featured: true,
    regex: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{3})?(?:Z|[+-]\\d{2}:\\d{2})?$",
    description: n(
      "Fecha y hora en formato ISO 8601.",
      "Date and time in ISO 8601 format."
    ),
    example: "2024-01-15T10:30:00Z",
  },
  {
    id: "card",
    name: n("Tarjeta de crédito", "Credit card"),
    cat: "payments",
    flags: "",
    regex:
      "^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12})$",
    description: n(
      "Visa, Mastercard, Amex, Discover, Diners y JCB. Solo formato, no Luhn.",
      "Visa, Mastercard, Amex, Discover, Diners and JCB. Format only, no Luhn."
    ),
    example: "4111111111111111",
  },
  {
    id: "slug",
    name: n("Slug de URL", "URL slug"),
    cat: "web",
    flags: "i",
    featured: true,
    regex: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
    description: n(
      "Slug amigable para URLs (letras, números y guiones).",
      "URL-friendly slug (letters, numbers and hyphens)."
    ),
    example: "mi-articulo-de-prueba",
  },
  {
    id: "username",
    name: n("Nombre de usuario", "Username"),
    cat: "validation",
    flags: "",
    regex: "^[a-zA-Z0-9_]{3,20}$",
    description: n(
      "Alfanumérico y guiones bajos, de 3 a 20 caracteres.",
      "Alphanumeric plus underscores, 3 to 20 characters."
    ),
    example: "usuario_01",
  },
  {
    id: "password",
    name: n("Contraseña segura", "Strong password"),
    cat: "security",
    flags: "",
    regex: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$",
    description: n(
      "Mínimo 8 caracteres, con mayúscula, minúscula, número y símbolo.",
      "At least 8 characters, with upper case, lower case, a digit and a symbol."
    ),
    example: "Segura2024!",
  },
  {

    id: "postal-es",
    name: n("Código postal de España", "Spanish postal code"),
    cat: "spain",
    flags: "",
    regex: "^(?:0[1-9]|[1-4]\\d|5[0-2])\\d{3}$",
    description: n(
      "Código postal español de 5 dígitos, con provincia válida.",
      "5-digit Spanish postal code, with a valid province."
    ),
    example: "28013",
  },
  {
    id: "dni-nie",
    name: n("DNI/NIE de España", "Spanish DNI/NIE"),
    cat: "identity",
    flags: "i",
    regex: "^(?:[0-9]{8}[TRWAGMYFPDXBNJZSQVHLCKE]|[XYZ][0-9]{7}[TRWAGMYFPDXBNJZSQVHLCKE])$",
    description: n(
      "DNI (8 dígitos y letra) o NIE (X, Y o Z, 7 dígitos y letra).",
      "DNI (8 digits and a letter) or NIE (X, Y or Z, 7 digits and a letter)."
    ),
    example: "12345678Z",
  },
  {
    id: "phone",
    name: n("Teléfono internacional", "International phone"),
    cat: "phone",
    flags: "",
    regex: "^\\+[1-9]\\d{1,14}$",
    description: n(
      "Formato E.164 (por ejemplo, +34600000000).",
      "E.164 format (for example, +34600000000)."
    ),
    example: "+34600000000",
  },
  {
    id: "hex-color",
    name: n("Color hexadecimal", "Hex color"),
    cat: "css",
    flags: "i",
    regex: "^#(?:[A-Fa-f0-9]{3}|[A-Fa-f0-9]{4}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$",
    description: n(
      "Color en CSS: #RGB, #RGBA, #RRGGBB o #RRGGBBAA.",
      "CSS colour: #RGB, #RGBA, #RRGGBB or #RRGGBBAA."
    ),
    example: "#4f46e5",
  },
  {
    id: "rgb-color",
    name: n("Color RGB/RGBA", "RGB/RGBA color"),
    cat: "css",
    flags: "i",
    regex: "^rgba?\\(\\s*\\d{1,3}\\s*,\\s*\\d{1,3}\\s*,\\s*\\d{1,3}\\s*(?:,\\s*[\\d.]+\\s*)?\\)$",
    description: n(
      "Función CSS rgb() o rgba().",
      "The CSS rgb() or rgba() function."
    ),
    example: "rgba(79, 70, 229, 0.5)",
  },
  {

    id: "json",
    name: n("JSON (comprobación básica)", "JSON (basic check)"),
    cat: "json",
    flags: "",
    regex: "^\\s*[{\\[][\\s\\S]*[}\\]]\\s*$",
    description: n(
      "Comprueba que el texto empieza y termina como objeto o array. Una regex no puede validar la estructura de un JSON.",
      "Checks that the text opens and closes like an object or an array. A regex cannot validate JSON structure."
    ),
    example: '{ "a": 1 }',
  },
  {
    id: "base64",
    name: n("Base64", "Base64"),
    cat: "encoding",
    flags: "",
    regex: "^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{4}|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)$",
    description: n(
      "Cadena codificada en Base64, con o sin relleno.",
      "Base64-encoded string, with or without padding."
    ),
    example: "SGVsbG8gd29ybGQ=",
  },
  {
    id: "html-tag",
    name: n("Etiqueta HTML", "HTML tag"),
    cat: "html",
    flags: "gi",
    regex: "<([a-z][a-z0-9]*)(?:\\s[^>]*)?>([\\s\\S]*?)<\\/\\1>",
    description: n(
      "Etiqueta HTML con su contenido y sus atributos.",
      "HTML tag with its content and attributes."
    ),
    example: '<div class="card">Hola</div>',
  },
  {
    id: "md-link",
    name: n("Enlace Markdown", "Markdown link"),
    cat: "markdown",
    flags: "g",
    regex: "\\[([^\\]]+)\\]\\(([^)]+)\\)",
    description: n(
      "Enlace en formato Markdown: [texto](url).",
      "Markdown link: [text](url)."
    ),
    example: "Consulta la [documentación](https://ejemplo.com)",
  },
  {
    id: "git-hash",
    name: n("Hash de commit de Git", "Git commit hash"),
    cat: "git",
    flags: "i",
    regex: "^[a-f0-9]{40}$",
    description: n(
      "Hash SHA-1 de un commit de Git: 40 caracteres hexadecimales.",
      "SHA-1 hash of a Git commit: 40 hexadecimal characters."
    ),
    example: "da39a3ee5e6b4b0d3255bfef95601890afd80709",
  },
  {
    id: "semver",
    name: n("SemVer", "SemVer"),
    cat: "versioning",
    flags: "",
    regex:
      "^v?(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-((?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\\+([0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*))?$",
    description: n(
      "Versionado semántico, con prefijo v opcional y metadatos de compilación.",
      "Semantic versioning, with an optional v prefix and build metadata."
    ),
    example: "1.2.3-alpha.1",
  },
  {
    id: "mac",
    name: n("Dirección MAC", "MAC address"),
    cat: "network",
    flags: "i",
    regex: "^(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$",
    description: n(
      "Dirección MAC en formato AA:BB:CC:DD:EE:FF.",
      "MAC address in AA:BB:CC:DD:EE:FF format."
    ),
    example: "00:1B:44:11:3A:B7",
  },
];

export const FEATURED_PATTERNS: LibraryPattern[] = PATTERNS.filter((p) => p.featured);

export function literal(pattern: string, flags: string): string {
  return "/" + pattern.replace(/\\[\s\S]|\//g, (x) => (x === "/" ? "\\/" : x)) + "/" + flags;
}

export function labHref(pattern: string, flags?: string): string {
  const q = new URLSearchParams();
  q.set("p", pattern);
  if (flags !== undefined && flags !== null) q.set("f", flags);
  return "/lab#" + q.toString();
}

export function loc(value: Localized, lang: Lang): string {
  return value[lang];
}
