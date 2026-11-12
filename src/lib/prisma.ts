import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma";
import { SUPABASE_CA } from "@/lib/supabase-ca";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const POOL_MAX = 1;

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    return new Proxy({} as PrismaClient, {
      get() {
        throw new Error(
          "PrismaClient is unavailable because DATABASE_URL is not set."
        );
      },
    });
  }

  const adapter = new PrismaPg({
    connectionString,
    max: POOL_MAX,

    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    ssl: { ca: SUPABASE_CA, rejectUnauthorized: true },
  });

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;