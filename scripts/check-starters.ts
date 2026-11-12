import { STARTER_PATTERNS } from "@/lib/regex/starter-patterns";
import { analyzeReDoS } from "@/lib/regex/safety";

let failed = false;

console.log(`Validando ${STARTER_PATTERNS.length} patrones del catálogo...\n`);

for (const p of STARTER_PATTERNS) {
  const problems: string[] = [];

  try {
    const re = new RegExp(p.regex, p.flags);
    if (p.example && !re.test(p.example)) {
      problems.push(`el ejemplo "${p.example}" NO coincide`);
    }

    if (re.test("")) problems.push("coincide con la cadena vacía");
  } catch (e) {
    problems.push(`no compila: ${e instanceof Error ? e.message : e}`);
  }

  for (const finding of analyzeReDoS(p.regex)) {
    problems.push(`ReDoS [${finding.rule}]: ${finding.message}`);
  }

  if (problems.length > 0) {
    failed = true;
    console.log(`  FALLO  ${p.name}`);
    for (const msg of problems) console.log(`         - ${msg}`);
  } else {
    console.log(`  ok     ${p.name}`);
  }
}

console.log("");
if (failed) {
  console.log("FALLOS detectados.");
  process.exit(1);
}
console.log("Todos los patrones compilan, sus ejemplos coinciden y ninguno dispara la heurística ReDoS.");