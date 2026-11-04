"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";
import OpenAI from "openai";
import { PHARMACY_AI_MODEL } from "@/lib/ai/tools";
import type { Session } from "next-auth";

function assertCanManageCategories(session: Session | null) {
  if (!session?.user?.organizationId) throw new Error("Unauthorized");
  if (session.user.role !== "ADMIN" && session.user.role !== "PHARM_TECH") {
    throw new Error("Unauthorized");
  }
  return {
    orgId: session.user.organizationId,
    userId: session.user.id,
  };
}

function slugifyCategoryName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getAiClient(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key?.trim()) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  return new OpenAI({ apiKey: key });
}

const upsertDrugCategorySchema = z.object({
  name: z.string().min(2).max(80).transform((s) => s.trim()),
});

export type DrugCategoryListItem = Awaited<
  ReturnType<typeof listDrugCategories>
>[number];

export async function listDrugCategories() {
  const session = await auth();
  if (!session?.user?.organizationId) return [];
  const orgId = session.user.organizationId;

  return prisma.drugCategory.findMany({
    where: { organizationId: orgId },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { drugs: true } },
    },
  });
}

export async function upsertDrugCategory(input: unknown, id?: string) {
  const session = await auth();
  const { orgId, userId } = assertCanManageCategories(session);

  const data = upsertDrugCategorySchema.parse(input);
  const slug = slugifyCategoryName(data.name);
  if (!slug) throw new Error("Category name is invalid.");

  if (id) {
    const existing = await prisma.drugCategory.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true, name: true, slug: true },
    });
    if (!existing) throw new Error("Category not found.");

    const updated = await prisma.drugCategory.update({
      where: { id },
      data: { name: data.name, slug },
    });

    await writeAuditLog({
      organizationId: orgId,
      userId,
      action: "drug_category.update",
      entityType: "DrugCategory",
      entityId: id,
      metadata: { name: data.name },
    });

    revalidatePath("/inventory/drugs");
    return updated;
  }

  const created = await prisma.drugCategory.create({
    data: {
      organizationId: orgId,
      name: data.name,
      slug,
    },
  });

  await writeAuditLog({
    organizationId: orgId,
    userId,
    action: "drug_category.create",
    entityType: "DrugCategory",
    entityId: created.id,
    metadata: { name: created.name },
  });

  revalidatePath("/inventory/drugs");
  return created;
}

export async function deleteDrugCategory(id: string) {
  const session = await auth();
  const { orgId, userId } = assertCanManageCategories(session);

  const existing = await prisma.drugCategory.findFirst({
    where: { id, organizationId: orgId },
    select: { id: true, name: true, slug: true, _count: { select: { drugs: true } } },
  });
  if (!existing) throw new Error("Not found.");
  if (existing._count.drugs > 0) {
    throw new Error("Cannot delete a category that is assigned to drugs.");
  }

  await prisma.drugCategory.delete({ where: { id } });

  await writeAuditLog({
    organizationId: orgId,
    userId,
    action: "drug_category.delete",
    entityType: "DrugCategory",
    entityId: id,
    metadata: { name: existing.name, slug: existing.slug },
  });

  revalidatePath("/inventory/drugs");
}

const suggestCategoriesResponseSchema = z.object({
  existingCategoryIds: z.array(z.string().cuid()).default([]),
  newCategoryNames: z.array(z.string().min(2).max(80)).default([]),
});

export async function suggestDrugCategoriesForDrug(drugId: string): Promise<{
  existingCategoryIds: string[];
  newCategoryNames: string[];
}> {
  const session = await auth();
  const { orgId } = assertCanManageCategories(session);

  const [drug, categories] = await Promise.all([
    prisma.drug.findFirst({
      where: { id: drugId, organizationId: orgId },
      select: {
        id: true,
        genericName: true,
        brandName: true,
        dosageForm: true,
        strengthValue: true,
        strengthUnit: true,
        routeOfAdmin: true,
        therapeuticCategory: true,
        atcCode: true,
      },
    }),
    prisma.drugCategory.findMany({
      where: { organizationId: orgId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
  ]);

  if (!drug) throw new Error("Drug not found.");
  if (categories.length === 0) {
    return { existingCategoryIds: [], newCategoryNames: [] };
  }

  const client = getAiClient();

  const prompt = [
    "You are helping categorize a pharmacy drug into therapeutic/sales categories.",
    "Return STRICT JSON only, no markdown and no extra keys, matching:",
    `{"existingCategoryIds":["cuid", ...], "newCategoryNames":["string", ...]}`,
    "",
    "Rules:",
    "- Prefer selecting from existing categories when possible.",
    "- Avoid duplicates: treat names as duplicates if their slugified form matches existing slugs.",
    "- Suggest at most 6 existingCategoryIds and at most 6 newCategoryNames.",
    "- Use real-world category names used in pharmacies (Kenya/general).",
    "- If unsure, return empty arrays.",
    "",
    "Drug:",
    JSON.stringify(drug),
    "",
    "Existing categories (id,name,slug):",
    JSON.stringify(categories),
  ].join("\n");

  const completion = await client.chat.completions.create({
    model: PHARMACY_AI_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You output strict JSON only. Never output markdown, code fences, or explanations.",
      },
      { role: "user", content: prompt },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? "";
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Sometimes the model returns leading text; try to salvage the first JSON object.
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      parsed = JSON.parse(raw.slice(start, end + 1));
    } else {
      throw new Error("AI did not return valid JSON.");
    }
  }

  const out = suggestCategoriesResponseSchema.parse(parsed);

  const existingSet = new Set(categories.map((c) => c.id));
  const validExisting = out.existingCategoryIds.filter((id) => existingSet.has(id)).slice(0, 6);

  const existingSlugSet = new Set(categories.map((c) => c.slug));
  const newNames: string[] = [];
  for (const n of out.newCategoryNames) {
    const name = n.trim();
    if (name.length < 2) continue;
    const slug = slugifyCategoryName(name);
    if (!slug) continue;
    if (existingSlugSet.has(slug)) continue;
    if (newNames.some((x) => slugifyCategoryName(x) === slug)) continue;
    newNames.push(name);
    if (newNames.length >= 6) break;
  }

  return {
    existingCategoryIds: validExisting,
    newCategoryNames: newNames,
  };
}

