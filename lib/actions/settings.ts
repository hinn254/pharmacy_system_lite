"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { putPublicObject } from "@/lib/uploads/s3";

const settingsSchema = z.object({
  businessName: z.string().max(120).optional().nullable(),
  businessTagline: z.string().max(160).optional().nullable(),
  website: z.string().max(200).optional().nullable(),
  phoneNumber: z.string().max(50).optional().nullable(),
  email: z.string().max(120).optional().nullable(),
  controlledDrugCategoryIds: z.array(z.string()).optional(),
  taxRatePercent: z.coerce.number().min(0).max(100),
  receiptHeader: z.string().max(512).optional().nullable(),
  receiptFooter: z.string().max(512).optional().nullable(),
  invoiceTitle: z.string().max(120).optional().nullable(),
  invoiceSubtitle: z.string().max(160).optional().nullable(),
  invoiceFooter: z.string().max(512).optional().nullable(),
  invoiceShowLogo: z.coerce.boolean().optional(),
  invoiceAccentColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{6})$/, "Use a 6-digit hex color like #2563eb")
    .optional()
    .nullable(),
  defaultLowStockDays: z.coerce.number().int().positive().optional().nullable(),
  mpesaEnvironment: z.enum(["sandbox", "production"]),
  insuranceNotes: z.string().max(2000).optional().nullable(),
});

export async function getOrganizationSettings() {
  const session = await auth();
  if (!session?.user?.organizationId) return null;
  return prisma.organizationSettings.findUnique({
    where: { orgId: session.user.organizationId },
  });
}

export async function updateOrganizationSettings(input: unknown) {
  const session = await auth();
  if (!session?.user?.organizationId || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  const orgId = session.user.organizationId;
  const inputObj =
    typeof input === "object" && input !== null ? (input as Record<string, unknown>) : null;
  const wantsInvoiceTemplateUpdate = Boolean(
    inputObj &&
      (Object.prototype.hasOwnProperty.call(inputObj, "invoiceTitle") ||
        Object.prototype.hasOwnProperty.call(inputObj, "invoiceSubtitle") ||
        Object.prototype.hasOwnProperty.call(inputObj, "invoiceFooter") ||
        Object.prototype.hasOwnProperty.call(inputObj, "invoiceShowLogo") ||
        Object.prototype.hasOwnProperty.call(inputObj, "invoiceAccentColor"))
  );
  const wantsControlledDrugCategoriesUpdate = Boolean(
    inputObj &&
      Object.prototype.hasOwnProperty.call(inputObj, "controlledDrugCategoryIds"),
  );
  const data = settingsSchema.parse(input);

  const controlledDrugCategoryIds = wantsControlledDrugCategoriesUpdate
    ? [
        ...new Set(
          (data.controlledDrugCategoryIds ?? [])
            .map((id) => id.trim())
            .filter(Boolean),
        ),
      ]
    : undefined;

  if (wantsControlledDrugCategoriesUpdate) {
    const ids = controlledDrugCategoryIds ?? [];
    if (ids.length > 0) {
      const count = await prisma.drugCategory.count({
        where: { organizationId: orgId, id: { in: ids } },
      });
      if (count !== ids.length) {
        throw new Error("One or more controlled drug categories are invalid.");
      }
    }
  }

  const invoiceTemplate = wantsInvoiceTemplateUpdate
    ? ({
        title: data.invoiceTitle ?? null,
        subtitle: data.invoiceSubtitle ?? null,
        footer: data.invoiceFooter ?? null,
        showLogo: data.invoiceShowLogo ?? true,
        accentColor: data.invoiceAccentColor ?? null,
      } as const)
    : undefined;

  const updated = await prisma.organizationSettings.upsert({
    where: { orgId },
    create: {
      orgId,
      businessName: data.businessName,
      businessTagline: data.businessTagline,
      website: data.website,
      phoneNumber: data.phoneNumber,
      email: data.email,
      ...(wantsControlledDrugCategoriesUpdate && controlledDrugCategoryIds !== undefined
        ? { controlledDrugCategoryIds }
        : {}),
      taxRatePercent: new Prisma.Decimal(data.taxRatePercent),
      receiptHeader: data.receiptHeader,
      receiptFooter: data.receiptFooter,
      ...(invoiceTemplate ? { invoiceTemplate } : {}),
      defaultLowStockDays: data.defaultLowStockDays ?? null,
      mpesaEnvironment: data.mpesaEnvironment,
      insuranceNotes: data.insuranceNotes,
    },
    update: {
      businessName: data.businessName,
      businessTagline: data.businessTagline,
      website: data.website,
      phoneNumber: data.phoneNumber,
      email: data.email,
      ...(wantsControlledDrugCategoriesUpdate && controlledDrugCategoryIds !== undefined
        ? { controlledDrugCategoryIds }
        : {}),
      taxRatePercent: new Prisma.Decimal(data.taxRatePercent),
      receiptHeader: data.receiptHeader,
      receiptFooter: data.receiptFooter,
      ...(invoiceTemplate ? { invoiceTemplate } : {}),
      defaultLowStockDays: data.defaultLowStockDays ?? null,
      mpesaEnvironment: data.mpesaEnvironment,
      insuranceNotes: data.insuranceNotes,
    },
  });

  await writeAuditLog({
    organizationId: orgId,
    userId: session.user.id,
    action: "settings.update",
    entityType: "OrganizationSettings",
    entityId: updated.id,
  });

  revalidatePath("/admin/settings");
  return updated;
}

const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);
const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2MB

export async function uploadOrganizationLogo(formData: FormData) {
  const session = await auth();
  if (!session?.user?.organizationId || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const file = formData.get("logo");
  if (!(file instanceof File)) {
    throw new Error("No file uploaded");
  }
  if (file.size <= 0) {
    throw new Error("Empty file");
  }
  if (file.size > MAX_LOGO_BYTES) {
    throw new Error("Logo must be 2MB or less");
  }
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Please upload a PNG, JPG, WebP, or SVG image");
  }

  const orgId = session.user.organizationId;
  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/jpeg"
        ? "jpg"
        : file.type === "image/webp"
          ? "webp"
          : "svg";

  const key = `${orgId}/org/logo.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const logoUrl = await putPublicObject({
    key,
    body: bytes,
    contentType: file.type || "application/octet-stream",
  });

  const updated = await prisma.organizationSettings.upsert({
    where: { orgId },
    create: {
      orgId,
      logoUrl,
      taxRatePercent: new Prisma.Decimal(16),
      mpesaEnvironment: "sandbox",
    },
    update: { logoUrl },
  });

  await writeAuditLog({
    organizationId: orgId,
    userId: session.user.id,
    action: "settings.logo.update",
    entityType: "OrganizationSettings",
    entityId: updated.id,
  });

  revalidatePath("/admin/settings");
  return { logoUrl };
}
