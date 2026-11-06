"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { Prisma, DiscountPatientSegment, DiscountScopeType, DiscountValueType } from "@prisma/client";
import { z } from "zod";

const upsertDiscountCodeSchema = z
  .object({
    code: z
      .string()
      .min(2, "Enter a discount code with at least 2 characters.")
      .max(32, "Keep the discount code to 32 characters or fewer.")
      .transform((s) => s.trim().toUpperCase())
      .refine((s) => /^[A-Z0-9_-]+$/.test(s), {
        message: "Code must use letters/numbers/_/- only.",
      }),
    name: z
      .string()
      .trim()
      .min(2, "Enter a discount name with at least 2 characters.")
      .max(120, "Keep the discount name to 120 characters or fewer."),
    active: z.boolean().default(true),
    stackable: z.boolean().default(true),
    priority: z.coerce.number().int().min(-1000).max(1000).default(0),

    valueType: z.nativeEnum(DiscountValueType),
    valuePercent: z.coerce.number().gt(0, "Enter a discount percentage greater than 0.").max(100, "Discount percentage cannot be more than 100%.").optional().nullable(),
    valueAmount: z.coerce.number().gt(0, "Enter a fixed discount amount greater than 0.").optional().nullable(),

    scopeType: z.nativeEnum(DiscountScopeType).default(DiscountScopeType.ALL_DRUGS),
    drugIds: z.array(z.string().min(1)).optional().default([]),

    patientSegment: z
      .nativeEnum(DiscountPatientSegment)
      .default(DiscountPatientSegment.ANY),
    sessionTag: z.string().max(64).optional().nullable(),
    patientIds: z.array(z.string().min(1)).optional().default([]),

    startsAt: z.coerce.date().optional().nullable(),
    endsAt: z.coerce.date().optional().nullable(),
    expiresAt: z.coerce.date().optional().nullable(),
  })
  .superRefine((v, ctx) => {
    if (v.valueType === DiscountValueType.PERCENT) {
      if (v.valuePercent == null || !Number.isFinite(v.valuePercent)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["valuePercent"],
          message: "Percent value is required.",
        });
      }
    }
    if (v.valueType === DiscountValueType.FIXED) {
      if (v.valueAmount == null || !Number.isFinite(v.valueAmount) || v.valueAmount <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["valueAmount"],
          message: "Amount value is required.",
        });
      }
    }
    if (v.scopeType === DiscountScopeType.DRUGS && (!v.drugIds || v.drugIds.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["drugIds"],
        message: "Select at least one drug, or set scope to All drugs.",
      });
    }
  });

export type DiscountCodeListItem = Awaited<ReturnType<typeof listDiscountCodes>>[number];

export async function listDiscountCodes() {
  const session = await auth();
  if (!session?.user?.organizationId || session.user.role !== "ADMIN") return [];
  const orgId = session.user.organizationId;

  const rows = await prisma.discountCode.findMany({
    where: { organizationId: orgId },
    orderBy: [{ active: "desc" }, { priority: "desc" }, { createdAt: "desc" }],
    include: {
      drugs: { include: { drug: { select: { id: true, genericName: true, internalCode: true } } } },
      patients: { include: { patient: { select: { id: true, fullName: true, phone: true, email: true } } } },
    },
  });

  // Prisma Decimal instances cannot cross a Server Action boundary. Convert
  // them to plain numbers before returning the rows to the client component.
  return rows.map((row) => ({
    ...row,
    valuePercent: row.valuePercent?.toNumber() ?? null,
    valueAmount: row.valueAmount?.toNumber() ?? null,
  }));
}

export async function upsertDiscountCode(input: unknown, id?: string) {
  const session = await auth();
  if (!session?.user?.organizationId || session.user.role !== "ADMIN") {
    return { ok: false as const, error: "You do not have permission to manage discount codes." };
  }
  const orgId = session.user.organizationId;
  const userId = session.user.id;

  const parsed = upsertDiscountCodeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Check the discount details and try again.",
    };
  }
  const data = parsed.data;

  const payload = {
    organizationId: orgId,
    code: data.code,
    name: data.name,
    active: data.active,
    stackable: data.stackable,
    priority: data.priority,
    valueType: data.valueType,
    valuePercent:
      data.valueType === DiscountValueType.PERCENT && data.valuePercent != null
        ? new Prisma.Decimal(data.valuePercent)
        : null,
    valueAmount:
      data.valueType === DiscountValueType.FIXED && data.valueAmount != null
        ? new Prisma.Decimal(data.valueAmount)
        : null,
    scopeType: data.scopeType,
    patientSegment: data.patientSegment,
    sessionTag: data.sessionTag?.trim() || null,
    startsAt: data.startsAt ?? null,
    endsAt: data.endsAt ?? null,
    expiresAt: data.expiresAt ?? null,
  };

  if (id) {
    const existing = await prisma.discountCode.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true },
    });
    if (!existing) throw new Error("Discount code not found.");

    const updated = await prisma.discountCode.update({
      where: { id },
      data: {
        ...payload,
        drugs: {
          deleteMany: {},
          create: data.scopeType === DiscountScopeType.DRUGS
            ? data.drugIds.map((drugId) => ({ drugId }))
            : [],
        },
        patients: {
          deleteMany: {},
          create: data.patientIds.map((patientId) => ({ patientId })),
        },
      },
    });

    await writeAuditLog({
      organizationId: orgId,
      userId,
      action: "discount_code.update",
      entityType: "DiscountCode",
      entityId: id,
      metadata: { code: data.code },
    });
    revalidatePath("/admin/settings");
    return { ok: true as const, id: updated.id };
  }

  const created = await prisma.discountCode.create({
    data: {
      ...payload,
      drugs: {
        create:
          data.scopeType === DiscountScopeType.DRUGS
            ? data.drugIds.map((drugId) => ({ drugId }))
            : [],
      },
      patients: {
        create: data.patientIds.map((patientId) => ({ patientId })),
      },
    },
  });

  await writeAuditLog({
    organizationId: orgId,
    userId,
    action: "discount_code.create",
    entityType: "DiscountCode",
    entityId: created.id,
    metadata: { code: data.code },
  });
  revalidatePath("/admin/settings");
  return { ok: true as const, id: created.id };
}

export async function deleteDiscountCode(id: string) {
  const session = await auth();
  if (!session?.user?.organizationId || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  const orgId = session.user.organizationId;
  const userId = session.user.id;

  const existing = await prisma.discountCode.findFirst({
    where: { id, organizationId: orgId },
    select: { id: true, code: true },
  });
  if (!existing) throw new Error("Not found.");

  await prisma.discountCode.delete({ where: { id } });
  await writeAuditLog({
    organizationId: orgId,
    userId,
    action: "discount_code.delete",
    entityType: "DiscountCode",
    entityId: id,
    metadata: { code: existing.code },
  });
  revalidatePath("/admin/settings");
}

export async function setDiscountCodeActive(id: string, active: boolean) {
  const session = await auth();
  if (!session?.user?.organizationId || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  const orgId = session.user.organizationId;
  const userId = session.user.id;

  const existing = await prisma.discountCode.findFirst({
    where: { id, organizationId: orgId },
    select: { id: true, code: true },
  });
  if (!existing) throw new Error("Not found.");

  await prisma.discountCode.update({ where: { id }, data: { active } });
  await writeAuditLog({
    organizationId: orgId,
    userId,
    action: "discount_code.set_active",
    entityType: "DiscountCode",
    entityId: id,
    metadata: { code: existing.code, active },
  });
  revalidatePath("/admin/settings");
}

export async function listActiveDiscountCodesForPos() {
  const session = await auth();
  if (!session?.user?.organizationId) return [];
  const orgId = session.user.organizationId;

  const now = new Date();
  return prisma.discountCode.findMany({
    where: {
      organizationId: orgId,
      active: true,
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        { OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
      ],
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    select: {
      code: true,
      name: true,
      valueType: true,
      valuePercent: true,
      valueAmount: true,
      scopeType: true,
      patientSegment: true,
      sessionTag: true,
    },
  });
}

