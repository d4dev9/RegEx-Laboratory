import { execFileSync } from "node:child_process";
import { analyzeReDoS, compileUserRegex } from "@/lib/regex/safety";
import { STARTER_PATTERNS } from "@/lib/regex/starter-patterns";

function measureInChild(pattern: string, hostile: string, timeoutMs = 4000): number | null {
  const script = `
    const pattern = ${JSON.stringify(pattern)};
    const hostile = ${JSON.stringify(hostile)};
    const re = new RegExp(pattern);
    const t = Date.now();
    re.test(hostile);
    process.stdout.write(String(Date.now() - t));
  `;
  try {
    const out = execFileSync(
      process.execPath,
      ["-e", script],
      { timeout: timeoutMs, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
    );
    return Number(out.trim());
  } catch {

    return null;
  }
}

const EVIL: Array<{ pattern: string; hostile: string }> = [
  { pattern: "(a+)+$", hostile: `${"a".repeat(30)}!` },
  { pattern: "(a|a)+$", hostile: `${"a".repeat(30)}!` },
  { pattern: "([a-z]+)+$", hostile: `${"a".repeat(30)}!` },
  { pattern: "(\\d+)+$", hostile: `${"1".repeat(30)}!` },
  { pattern: "(a*)*$", hostile: `${"a".repeat(30)}!` },
  { pattern: "\\d+\\d+$", hostile: `${"1".repeat(40)}!` },
  { pattern: "[a-z]+[a-z]+$", hostile: `${"a".repeat(60)}!` },
  { pattern: "(x+x+)+y", hostile: `${"x".repeat(24)}z` },
];

console.log("1) Patrones genuinamente catastróficos");
console.log("   (el hijo se mata a los 4s; 'KILLED' = ReDoS real confirmado)\n");

let undetected = 0;
for (const { pattern, hostile } of EVIL) {
  const findings = analyzeReDoS(pattern);
  const flagged = findings.length > 0;
  const ms = measureInChild(pattern, hostile);

  const timing = ms === null ? "KILLED (>4s)" : `${ms}ms`;
  const rules = flagged ? [...new Set(findings.map((f) => f.rule))].join(",") : "-";

  console.log(`  ${flagged ? "rechazado " : "NO DETECT."} ${pattern.padEnd(14)} ${rules.padEnd(34)} real: ${timing}`);
  if (!flagged) undetected++;
}

console.log("\n2) Patrones del catálogo (deben ser aceptados y rápidos)\n");

let slowAccepted = 0;
for (const p of STARTER_PATTERNS) {
  const compiled = compileUserRegex(p.regex, p.flags);
  if (!compiled.ok) {
    console.log(`  RECHAZADO  ${p.name}: ${compiled.error}`);
    slowAccepted++;
    continue;
  }

  const hostile = `${"x".repeat(2000)}${p.example}`;
  const ms = measureInChild(p.regex, hostile);
  const timing = ms === null ? "KILLED (>4s)" : `${ms}ms`;
  const ok = ms !== null && ms < 250;
  if (!ok) slowAccepted++;
  console.log(`  ${ok ? "ok        " : "REVISAR   "} ${p.name.padEnd(22)} real: ${timing}`);
}

console.log("");
if (undetected > 0) {
  console.log(`FALLO: ${undetected} patrón(es) peligroso(s) no detectado(s).`);
  process.exit(1);
}
if (slowAccepted > 0) {
  console.log(`FALLO: ${slowAccepted} patrón(es) del catálogo rechazado(s) o lento(s).`);
  process.exit(1);
}
console.log("Todos los patrones catastróficos conocidos son rechazados, y todo el catálogo se acepta y es rápido.");