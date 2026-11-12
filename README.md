<div align="center">

# Regex Lab

**[regexlab.indevs.in](https://regexlab.indevs.in/)**

Una herramienta para crear, probar y depurar expresiones regulares, con explicaciones detalladas en lenguaje natural. Escribe un patrón, pega tu texto y comprueba exactamente qué coincide
Disponible en español e inglés.

</div>

<div align="center">

[![Next.js](https://img.shields.io/badge/Next.js-16-000?logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-087ea4?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169e1?logo=postgresql&logoColor=white)](https://www.postgresql.org)

</div>

---

## Índice

- [Funcionalidades](#funcionalidades)
- [Stack tecnológico](#stack-tecnológico)
- [Inicio rápido](#inicio-rápido)
- [Documentación](#documentación)
- [Despliegue](#despliegue)
- [Seguridad](#seguridad)

---

## Funcionalidades

• **Evaluación en Tiempo Real:** Visualiza las coincidencias y grupos de captura al instante a medida que escribes, soportando flags (g, i, m, s, u, y).

• **Protección Anti-ReDoS:** Análisis estático integrado para prevenir bloqueos en el navegador por catastrophic backtracking.

• **Explicador Token por Token:** Traduce patrones complejos a lenguaje humano claro tanto en español como en inglés.

• **Exportación Multi-Lenguaje:** Convierte tu expresión regular a JavaScript, Python, Go, Rust, Java, C#, PHP y Ruby con un solo clic.

• **Librería de Patrones:** Más de 20 patrones listos para usar, filtrables por categoría.

• **Compartir sin fricción:** Comparte patrones mediante fragmentos de URL comprimidos o guárdalos en tu cuenta

• **Privado y Accesible:** Sin telemetría ni analíticas invasivas. Interfaz adaptable con temas claro/oscuro persistidos por cookies.

---

## Stack tecnológico

| Capa | Tecnología |
| --- | --- |
| Framework | Next.js 16, App Router, React 19 |
| Lenguaje | TypeScript 5, modo estricto |
| Base de datos | PostgreSQL, mediante Prisma 7 |
| Autenticación | Supabase Auth, proveedores Google y GitHub |
| Validación | Zod |
| Estilos | Propiedades personalizadas de CSS, sin dependencias visuales |
| Pruebas unitarias | Vitest |
| Integración continua | GitHub Actions |
| Alojamiento | Vercel |

---

## Inicio rápido

### Requisitos

- **Node.js 20.19** o superior.
- Un proyecto de **Supabase** con la autenticación activada. Solo hace falta
  para el inicio de sesión; el editor funciona sin él.

### Instalación

```bash
git clone https://github.com/d4dev9/RegEx-Laboratory.git
cd regex-laboratory
npm ci

cp .env.example .env.local    # y rellenar los valores
npm run db:migrate
npm run dev
```

Abre <http://localhost:3000>. El editor funciona de inmediato; los botones de
acceso necesitan la configuración de OAuth que se explica en
[`docs/DEPLOY.md`](docs/DEPLOY.md).

Cada variable de entorno está documentada en
[`.env.example`](.env.example).

### Base de datos

```bash
npm run db:migrate      # aplicar las migraciones
npm run db:status       # comprobar cuáles están aplicadas
npm run db:seed         # validar la biblioteca integrada
npm run db:studio       # explorar los datos
```

---

## Documentación

| Documento | Qué cubre |
| --- | --- |
| [`docs/DEPLOY.md`](docs/DEPLOY.md) | Despliegue en Vercel, variables de entorno, migraciones y comprobaciones |
| [`docs/TESTING.md`](docs/TESTING.md) | Estrategia de pruebas, la suite de navegador y todos los comandos |
| [`docs/API.md`](docs/API.md) | Endpoints REST |
| [`SECURITY.md`](SECURITY.md) | Cómo reportar una vulnerabilidad |

---

## Despliegue

La aplicación se despliega en Vercel: configura las variables de entorno del
proyecto, aplica las migraciones y despliega. La lista de comprobación completa,
incluidas las migraciones y la verificación posterior, está en
[`docs/DEPLOY.md`](docs/DEPLOY.md).

---

## Seguridad

Las vulnerabilidades se reportan en privado, sin abrir un issue público. El
procedimiento está descrito en [`SECURITY.md`](SECURITY.md).

---
