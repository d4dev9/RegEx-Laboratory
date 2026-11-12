import "dotenv/config";
import { defineConfig } from "prisma/config";

// CLI-only datasource. The application reads process.env.DATABASE_URL directly
// (see src/lib/prisma.ts), so this only affects `prisma migrate`/`db push`.
//
// Prefer DIRECT_URL here: Prisma's migrate engine needs advisory locks and
// session state, which PgBouncer *transaction* mode (port 6543) does not
// support -- `migrate deploy` hangs indefinitely against it. Use the session
// pooler (port 5432) for migrations and transaction mode for runtime queries.
const migrationsUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: migrationsUrl,
  },
});