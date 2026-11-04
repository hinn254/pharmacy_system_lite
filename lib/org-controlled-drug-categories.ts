import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  ddaCategorySetFromDb,
  type DdaCategoryIdSet,
} from "@/lib/controlled-drug-categories";

/**
 * Reads controlled-drug category ids without Prisma `select` on `controlledDrugCategoryIds`,
 * so the app still runs if the generated client was built before the array migration (stale
 * client only knows `controlledDrugCategoryId`). Also supports DBs that only have the legacy
 * column until migrations are applied.
 */
export async function fetchControlledDrugCategoryIdsForOrg(
  orgId: string,
): Promise<string[]> {
  try {
    const rows = await prisma.$queryRaw<
      Array<{ controlledDrugCategoryIds: string[] | null }>
    >(
      Prisma.sql`SELECT "controlledDrugCategoryIds" FROM "OrganizationSettings" WHERE "orgId" = ${orgId} LIMIT 1`,
    );
    const row = rows[0];
    if (!row) return [];
    return row.controlledDrugCategoryIds ?? [];
  } catch {
    // Column may not exist yet — fall through to legacy column.
  }

  try {
    const rows = await prisma.$queryRaw<
      Array<{ controlledDrugCategoryId: string | null }>
    >(
      Prisma.sql`SELECT "controlledDrugCategoryId" FROM "OrganizationSettings" WHERE "orgId" = ${orgId} LIMIT 1`,
    );
    const id = rows[0]?.controlledDrugCategoryId?.trim();
    return id ? [id] : [];
  } catch {
    return [];
  }
}

export async function getDdaCategorySetForOrg(orgId: string): Promise<DdaCategoryIdSet | null> {
  const ids = await fetchControlledDrugCategoryIdsForOrg(orgId);
  return ddaCategorySetFromDb(ids);
}
