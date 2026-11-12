# Estrategia de pruebas

Este documento explica cómo se valida RegexLab, qué herramientas se usan y cómo
reproducir cada capa de pruebas en local.

La idea de fondo es simple: **el laboratorio de regex es una interfaz**, y una
interfaz se rompe de formas que un analizador de tipos no ve. La estrategia tiene
tres capas, cada una con una responsabilidad distinta.

| Capa | Herramienta | Qué cubre | Dónde vive |
| --- | --- | --- | --- |
| Unitarias | Vitest | Lógica pura: motor de regex, analizador de ReDoS, validación, cuota, enlaces de compartición, i18n | `src/**/*.test.ts` |
| Navegador | Playwright | Lo que solo se rompe en un navegador real: maquetación, diálogos, foco, animaciones, desbordamiento | Suite de desarrollo (ver abajo) |
| Integración continua | GitHub Actions | Lint, tipos, unitarias, build y navegador | `.github/workflows/ci.yml` |

---

## Pruebas unitarias

Son **378 tests repartidos en 14 ficheros**, y corren en Node sin DOM porque lo
que se pone bajo prueba es lógica, no interfaz.

```bash
npm test           # una pasada
npm run test:watch # en modo watch
```

Cubren, entre otras cosas:

- El motor de coincidencia y sus límites de ejecución.
- El analizador de ReDoS, incluidos los falsos positivos conocidos.
- El catálogo de patrones: cada expresión acepta lo que debe aceptar y rechaza
  lo que debe rechazar.
- Los esquemas de validación (Zod) de los endpoints.
- El proveedor de autenticación y el ciclo de la sesión.
- El códec de los enlaces de compartición.
- La cuota de almacenamiento por cuenta.
- La auditoría de i18n, que falla si aparece un color literal fuera de
  `src/styles/tokens.css`.

---

## Pruebas en navegador real

### Qué se validó

Durante el desarrollo, RegexLab se validó con una suite de **314 pruebas de
Playwright**: 157 contra Chromium de escritorio y las mismas 157 contra un
viewport móvil. Esa suite no se incluye en este repositorio, porque este
repositorio es el producto y no su proceso interno. A continuación se explica
cómo reconstruir ese entorno si quieres esa cobertura.

La suite trabaja sobre la superficie anónima de la aplicación, que es la parte
que nunca debe romperse:

- Cada ruta devuelve 200, con exactamente un `h1` y sin desbordamiento
  horizontal.
- Los diálogos se abren, se centran y se cierran con `Escape`.
- El cambio de idioma sobrevive a una recarga.
- Un enlace de compartición restaura el editor en un contexto de navegador
  limpio.
- El guardia de ReDoS rechaza lo que tiene que rechazar.
- La copia al portapapeles, el conmutador de tema y las animaciones disparan
  de verdad.

### Por qué era obligatoria

Tres defectos del rediseño original **no eran visibles** ni para el analizador
de tipos ni para las unitarias, y solo aparecieron al abrir un navegador:

1. Un diálogo de acceso que no se centraba en pantallas altas.
2. Un desbordamiento horizontal a 360 px de ancho.
3. Una animación que nunca se disparaba porque la condición de arranque nunca
   se cumplía.

Por eso la suite de navegador no es un extra: es la única capa capaz de ver
esa clase de fallo.

### Cómo montar el entorno

**Requisitos**: Node 20.19 o superior, unos 2 GB de disco para los navegadores y
el puerto 3000 libre.

```bash
# 1. La dependencia de Playwright
npm install --save-dev @playwright/test

# 2. El navegador. En Windows y Linux con --with-deps se instalan también
#    las librerías del sistema que Chromium necesita
npx playwright install --with-deps chromium

# 3. La configuración
```

`playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  workers: process.env.CI ? 2 : 1,
  fullyParallel: true,
  reporter: process.env.CI
    ? [["github"], ["html", { outputFolder: "./.playwright-reports", open: "never" }]]
    : [["list"]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    locale: "es-ES",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 5"] } },
  ],
  webServer: {
    command: "npm run dev -- --port 3000",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
```

```bash
# 4. Los specs, en ./e2e/
npx playwright test            # toda la suite
npx playwright test --project=mobile
npx playwright test --ui       # con inspector
```

Cuatro decisiones de la configuración que conviene no cambiar sin motivo:

- **Un solo worker en local.** Estas pruebas corren contra `next dev`, que
  compila las rutas bajo demanda. Dos workers atacando dos rutas frías a la vez
 hacían fallar por tiempo de espera casos que en solitario pasaban, y el fallo
  se movía entre tests de una ejecución a otra. En CI la aplicación ya esta
  compilada, así que el segundo worker es barato.
- **`locale: "es-ES"`.** Las aserciones están escritas en castellano, que es el
  idioma por defecto. Fijarlo evita que un navegador en inglés locale produzca
  una página distinta a la que los tests esperan.
- **`reuseExistingServer` desactivado en CI.** Un proceso antiguo en el puerto
  3000 probaría silenciosamente el commit equivocado.
- **Los artefactos fuera del repositorio.** `test-results/` y
  `.playwright-reports/` están en `.gitignore`.

---

## Integración continua

El workflow de `.github/workflows/ci.yml` se ejecuta en cada `push` a `main` o
`master` y en cada pull request hacia esas ramas.

**Job `quality`** (siempre activo):

| Paso | Qué comprueba |
| --- | --- |
| `npm run lint` | ESLint sobre todo el proyecto |
| `npm run typecheck` | `tsc --noEmit` en modo estricto |
| `npm test` | Las 378 pruebas unitarias |
| `npm run build` | `prisma generate` y `next build` |

**Job de navegador** (en el repositorio de desarrollo). El job de Playwright
necesita una base de datos y una sesion de Supabase configuradas como secretos
del repositorio, de modo que se condiciona a que existan:

```yaml
env:
  HAS_DB: ${{ secrets.DATABASE_URL != '' }}
```

Cada paso se condiciona con `if: env.HAS_DB == 'true'`. La razon de leer el
secreto a nivel de job es que el contexto `secrets` no existe todavia en un
`if:` de job: se evalua antes de que el job tenga su propio contexto y usarla
ahi invalidaria el workflow entero.

---

## Comandos

### Pruebas

| Comando | Que hace |
| --- | --- |
| `npm test` | Pruebas unitarias |
| `npm run test:watch` | Unitarias en modo watch |
| `npm run check:starters` | Valida el catalogo: compilacion, ejemplos y guardia de ReDoS |
| `npm run verify:redos` | Mide en un proceso hijo las expresiones patologicas conocidas |
| `npx playwright test` | Suite de navegador (ver la seccion anterior) |

### Desarrollo

| Comando | Que hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo en http://localhost:3000 |
| `npm run build` | Genera el cliente de Prisma y compila |
| `npm start` | Arranca la compilacion de produccion |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run verify` | Encadena lint, tipos, unitarias y build |
| `npm run assets` | Regenera los iconos y el manifiesto web |

### Base de datos

| Comando | Que hace |
| --- | --- |
| `npm run db:generate` | Genera el cliente de Prisma |
| `npm run db:migrate` | Aplica las migraciones |
| `npm run db:migrate:dev` | Crea una migracion nueva a partir del esquema |
| `npm run db:status` | Comprobacion de que migraciones se han aplicado |
| `npm run db:push` | Sincroniza el esquema sin crear migracion |
| `npm run db:seed` | Valida la biblioteca integrada |
| `npm run db:studio` | Explorador de datos |

---

## Antes de publicar

1. `npm run verify` en verde.
2. `npm run check:starters` en verde.
3. La suite de navegador en verde sobre escritorio y movil, si se ha tocado la
   interfaz.
4. `git status` sin ficheros sin seguimiento: los artefactos de las pruebas
   no se versionan.

---

## Problemas frecuentes

**`ENOSPC` o el sistema se queda sin disco.** Chromium ocupa alrededor de 2 GB.
Borrar `test-results/` y `.playwright-reports/` antes de una ejecución larga
suele bastar.

**Las pruebas fallan por tiempo de espera en local.** El servidor de desarrollo
compila las rutas la primera vez. Si la ejecución es más rápida de lo que tarda
en compilar, sube el `timeout` de `webServer` o lanza `npm run dev` una vez
para dejar las rutas calientes.

**El puerto 3000 está ocupado.** La configuración reutiliza el servidor que ya
esté en pie en local, así que basta con cerrar el que estorbe.

**Un test es inestable y pasa al segundo intento.** En local no hay reintentos,
a propósito: un test que solo pasa a la segunda es un test roto, y reejecutarlo
en local solo esconde el problema.
