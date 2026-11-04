import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function postgresUrlParts(databaseUrl: string): {
  user?: string;
  host?: string;
} {
  try {
    const normalized = databaseUrl
      .trim()
      .replace(/^postgresql:\/\//i, "http://")
      .replace(/^postgres:\/\//i, "http://");
    const u = new URL(normalized);
    const user = decodeURIComponent(u.username ?? "");
    const host = u.hostname?.toLowerCase();
    return {
      user: user || undefined,
      host: host || undefined,
    };
  } catch {
    return {};
  }
}

/**
 * prisma_migration roles and Prisma Postgres (db.prisma.io) use tight connection ceilings.
 * Prisma Client's default pool (~ num_cpus × 2) exhausts them immediately.
 */
function defaultConnectionLimitForUrl(databaseUrl: string): string | undefined {
  const { user, host } = postgresUrlParts(databaseUrl);
  const u = user?.toLowerCase();
  if (u === "prisma_migration") return "1";
  if (host?.endsWith(".prisma.io")) return "1";
  return undefined;
}

/** Append connection_limit when missing — inferred for Prisma DB / migration role; else PRISMA_CONNECTION_LIMIT. */
function databaseUrlWithPoolCap(databaseUrl: string): string {
  if (/(?:\?|&)connection_limit=/i.test(databaseUrl)) return databaseUrl;

  const explicit = process.env.PRISMA_CONNECTION_LIMIT?.trim();
  const inferred = explicit ?? defaultConnectionLimitForUrl(databaseUrl);
  if (!inferred) return databaseUrl;

  const sep = databaseUrl.includes("?") ? "&" : "?";
  return `${databaseUrl}${sep}connection_limit=${encodeURIComponent(inferred)}`;
}

const rawUrl = process.env.DATABASE_URL?.trim();
const resolvedUrl = rawUrl ? databaseUrlWithPoolCap(rawUrl) : undefined;
const urlNeedsOverride = !!resolvedUrl && !!rawUrl && resolvedUrl !== rawUrl;

export const prisma =
  globalForPrisma.prisma ??
  (urlNeedsOverride
    ? new PrismaClient({
        datasources: { db: { url: resolvedUrl } },
      })
    : new PrismaClient());

globalForPrisma.prisma = prisma;
