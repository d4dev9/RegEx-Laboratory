-- Migración inicial consolidada: construye el esquema completo desde una base vacía.
--
-- No se puede regenerar con `prisma migrate dev`: Prisma no sabe expresar RLS ni
-- políticas en schema.prisma, y una migración generada automáticamente dejaría la
-- base sin la capa que impide que una clave `anon` filtrada lea datos privados.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
END
$$;

CREATE SCHEMA IF NOT EXISTS "public";

CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "authId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "patterns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "regex" TEXT NOT NULL,
    "flags" TEXT NOT NULL DEFAULT 'gm',
    "language" TEXT NOT NULL DEFAULT 'javascript',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[],
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sharedText" TEXT,

    CONSTRAINT "patterns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "test_cases" (
    "id" TEXT NOT NULL,
    "input" TEXT NOT NULL,
    "expected" BOOLEAN NOT NULL,
    "description" TEXT,
    "patternId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_cases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_authId_key" ON "users"("authId");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

CREATE INDEX "patterns_userId_idx" ON "patterns"("userId");
CREATE INDEX "patterns_isPublic_idx" ON "patterns"("isPublic");

CREATE INDEX "test_cases_patternId_idx" ON "test_cases"("patternId");
CREATE INDEX "test_cases_userId_idx" ON "test_cases"("userId");

CREATE INDEX "patterns_name_trgm_idx" ON "patterns" USING gin ("name" gin_trgm_ops);
CREATE INDEX "patterns_description_trgm_idx" ON "patterns" USING gin ("description" gin_trgm_ops);
CREATE INDEX "patterns_regex_trgm_idx" ON "patterns" USING gin ("regex" gin_trgm_ops);

CREATE INDEX "patterns_userId_updatedAt_idx" ON "patterns" ("userId", "updatedAt" DESC);

CREATE INDEX "patterns_isPublic_updatedAt_idx" ON "patterns" ("isPublic", "updatedAt" DESC)
    WHERE "isPublic" = true;

ALTER TABLE "patterns" ADD CONSTRAINT "patterns_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_patternId_fkey"
    FOREIGN KEY ("patternId") REFERENCES "patterns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shared patterns are readable"
    ON patterns FOR SELECT
    TO anon, authenticated
    USING ("isPublic" = true);

CREATE POLICY "patterns are not writable by the anon role"
    ON patterns FOR ALL
    TO anon
    USING (false)
    WITH CHECK (false);

CREATE POLICY "test cases are not writable by the anon role"
    ON test_cases FOR ALL
    TO anon
    USING (false)
    WITH CHECK (false);

CREATE POLICY "users are not writable by the anon role"
    ON users FOR ALL
    TO anon
    USING (false)
    WITH CHECK (false);

CREATE POLICY "users are readable only by the service role"
    ON users FOR SELECT
    TO authenticated
    USING (false);

REVOKE ALL ON TABLE patterns, test_cases, users FROM anon, authenticated;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = '_prisma_migrations'
  ) THEN
    EXECUTE 'ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY';
    EXECUTE 'REVOKE ALL ON TABLE "_prisma_migrations" FROM anon, authenticated';
  END IF;
END
$$;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    REVOKE ALL ON TABLES FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    REVOKE ALL ON SEQUENCES FROM anon, authenticated;
