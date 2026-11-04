"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { insuranceSchemeInputSchema } from "@/lib/validations/insurance-scheme";

export async function listInsuranceSchemes(options?: { activeOnly?: boolean }) {
  const session = await auth();
  if (!session?.user?.organizationId) return [];
  const activeOnly = options?.activeOnly ?? false;
  return prisma.insuranceScheme.findMany({
    where: {
      organizationId: session.user.organizationId,
      ...(activeOnly ? { isActive: true } : {}),
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
}

export async function upsertInsuranceScheme(input: unknown, id?: string) {
  const session = await auth();
  if (!session?.user?.organizationId || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  const orgId = session.user.organizationId;
  const userId = session.user.id;
  const data = insuranceSchemeInputSchema.parse(input);

  const payload = {
    name: data.name.trim(),
    code: data.code.trim().toUpperCase(),
    email: data.email?.trim() || null,
    phone: data.phone?.trim() || null,
    notes: data.notes?.trim() || null,
    isActive: data.isActive ?? true,
  };

  if (id) {
    const existing = await prisma.insuranceScheme.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) throw new Error("Not found");
    const updated = await prisma.insuranceScheme.update({
      where: { id },
      data: {
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        notes: payload.notes,
        isActive: payload.isActive,
      },
    });
    await writeAuditLog({
      organizationId: orgId,
      userId,
      action: "insuranceScheme.update",
      entityType: "InsuranceScheme",
      entityId: id,
    });
    revalidatePath("/admin/insurers");
    revalidatePath("/pos");
    return updated;
  }

  const created = await prisma.insuranceScheme.create({
    data: { ...payload, organizationId: orgId },
  });
  await writeAuditLog({
    organizationId: orgId,
    userId,
    action: "insuranceScheme.create",
    entityType: "InsuranceScheme",
    entityId: created.id,
  });
  revalidatePath("/admin/insurers");
  revalidatePath("/pos");
  return created;
}
