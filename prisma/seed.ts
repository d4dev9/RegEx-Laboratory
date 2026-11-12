import { STARTER_PATTERNS, STARTER_TAGS, validateStarterPatterns } from "../src/lib/regex/starter-patterns";
import { analyzeReDoS } from "../src/lib/regex/safety";

async function main() {
  console.log(`Validando la biblioteca integrada (${STARTER_PATTERNS.length} patrones)...\n`);

  const problems = validateStarterPatterns();

  for (const pattern of STARTER_PATTERNS) {
    for (const finding of analyzeReDoS(pattern.regex)) {
      problems.push(
        `${pattern.name}: ${finding.rule} — ${finding.message} (${finding.fragment})`
      );
    }
  }

  if (problems.length > 0) {
    console.error("✗ La biblioteca integrada tiene problemas:\n");
    for (const problem of problems) console.error(`   - ${problem}`);
    console.error(
      `\n${problems.length} problema(s). Corrige src/lib/regex/starter-patterns.ts antes de desplegar.`
    );
    process.exit(1);
  }

  console.log(`  ✓ ${STARTER_PATTERNS.length} patrones compilan`);
  console.log(`  ✓ todos los ejemplos coinciden`);
  console.log(`  ✓ ninguno dispara la heurística ReDoS`);
  console.log(`  ✓ ${STARTER_TAGS.length} etiquetas distintas`);

  console.log(`
Seed completado.

La biblioteca no se inserta en la base de datos: se sirve desde el código
(src/lib/regex/starter-patterns.ts) y está disponible para todos los usuarios
desde el primer momento, sin necesidad de semilla ni de propietario.
`);
}

main().catch((error) => {
  console.error("✗ Seed falló:", error);
  process.exit(1);
});