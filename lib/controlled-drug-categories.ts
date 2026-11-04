/**
 * Org-level DDA markers: any drug whose category ids intersect this set is treated as controlled.
 */
export type DdaCategoryIdSet = ReadonlySet<string>;

export function ddaCategorySetFromDb(
  ids: string[] | null | undefined,
): DdaCategoryIdSet | null {
  const unique = [...new Set((ids ?? []).map((id) => id.trim()).filter(Boolean))];
  if (unique.length === 0) return null;
  return new Set(unique);
}

export function drugIsDda(
  dda: DdaCategoryIdSet | null,
  drugCategories: { categoryId: string }[] | undefined,
): boolean {
  if (!dda || dda.size === 0) return false;
  if (!drugCategories?.length) return false;
  return drugCategories.some((c) => dda.has(c.categoryId));
}
