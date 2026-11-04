"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const patientSchema = z.object({
  fullName: z.string().min(1).max(256),
  phone: z.string().max(64).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  dob: z.coerce.date().optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
  marketingConsent: z.boolean().optional(),
});

const rxSchema = z.object({
  patientId: z.string().min(1),
  prescriberName: z.string().max(256).optional().nullable(),
  rxNumber: z.string().max(128).optional().nullable(),
  issuedAt: z.coerce.date().optional().nullable(),
  refillDueAt: z.coerce.date().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  items: z
    .array(
      z.object({
        drugId: z.string().min(1),
        quantity: z.coerce.number().int().positive(),
        instructions: z.string().max(512).optional().nullable(),
      }),
    )
    .min(1),
});

export async function searchPatients(q: string, limit = 30) {
  const session = await auth();
  if (!session?.user?.organizationId) return [];
  const term = q.trim();
  if (term.length < 1) return [];
  return prisma.patient.findMany({
    where: {
      organizationId: session.user.organizationId,
      OR: [
        { fullName: { contains: term, mode: "insensitive" } },
        { phone: { contains: term } },
        { email: { contains: term, mode: "insensitive" } },
      ],
    },
    take: limit,
    orderBy: { fullName: "asc" },
    select: {
      id: true,
      fullName: true,
      phone: true,
      email: true,
    },
  });
}

export async function listPatients() {
  const session = await auth();
  if (!session?.user?.organizationId) return [];
  return prisma.patient.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: { fullName: "asc" },
    include: {
      prescriptions: {
        orderBy: { createdAt: "desc" },
        include: { items: { include: { drug: true } } },
      },
    },
  });
}

export async function getPatientDetails(patientId: string) {
  const session = await auth();
  if (!session?.user?.organizationId) return null;

  return prisma.patient.findFirst({
    where: { id: patientId, organizationId: session.user.organizationId },
    include: {
      prescriptions: {
        orderBy: { createdAt: "desc" },
        include: {
          items: {
            orderBy: { id: "asc" },
            include: {
              drug: { select: { genericName: true, internalCode: true } },
            },
          },
        },
      },
      consultationCases: {
        orderBy: { createdAt: "desc" },
        include: {
          assignedDoctor: { select: { id: true, name: true, email: true } },
          encounters: {
            orderBy: { createdAt: "desc" },
            include: { createdBy: { select: { id: true, name: true, email: true } } },
          },
          medicationOrders: {
            orderBy: { createdAt: "desc" },
            include: {
              drug: {
                select: {
                  id: true,
                  genericName: true,
                  brandName: true,
                  internalCode: true,
                  dosageForm: true,
                  strengthValue: true,
                  strengthUnit: true,
                },
              },
            },
          },
          checkout: true,
        },
      },
      posOrders: {
        where: { prescriptionPhotoUrl: { not: null } },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          createdAt: true,
          prescriptionPhotoUrl: true,
        },
      },
    },
  });
}

export async function upsertPatient(input: unknown, id?: string) {
  const session = await auth();
  if (!session?.user?.organizationId) throw new Error("Unauthorized");
  const orgId = session.user.organizationId;
  const userId = session.user.id;
  const data = patientSchema.parse(input);

  const payload = {
    fullName: data.fullName,
    phone: data.phone || null,
    email: data.email || null,
    dob: data.dob ?? null,
    notes: data.notes || null,
    marketingConsent: data.marketingConsent ?? false,
  };

  if (id) {
    const existing = await prisma.patient.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) throw new Error("Not found");
    const u = await prisma.patient.update({ where: { id }, data: payload });
    await writeAuditLog({
      organizationId: orgId,
      userId,
      action: "patient.update",
      entityType: "Patient",
      entityId: id,
    });
    revalidatePath("/patients");
    return u;
  }

  const p = await prisma.patient.create({
    data: { ...payload, organizationId: orgId },
  });
  await writeAuditLog({
    organizationId: orgId,
    userId,
    action: "patient.create",
    entityType: "Patient",
    entityId: p.id,
  });
  revalidatePath("/patients");
  return p;
}

export async function createPrescription(input: unknown) {
  const session = await auth();
  if (!session?.user?.organizationId) throw new Error("Unauthorized");
  const orgId = session.user.organizationId;
  const userId = session.user.id;
  const data = rxSchema.parse(input);

  const patient = await prisma.patient.findFirst({
    where: { id: data.patientId, organizationId: orgId },
  });
  if (!patient) throw new Error("Patient not found");

  const rx = await prisma.prescription.create({
    data: {
      patientId: data.patientId,
      prescriberName: data.prescriberName,
      rxNumber: data.rxNumber,
      issuedAt: data.issuedAt,
      refillDueAt: data.refillDueAt,
      notes: data.notes,
      items: data.items?.length
        ? {
            create: data.items.map((i) => ({
              drugId: i.drugId,
              quantity: i.quantity,
              instructions: i.instructions,
            })),
          }
        : undefined,
    },
    include: { items: { include: { drug: true } } },
  });

  await writeAuditLog({
    organizationId: orgId,
    userId,
    action: "prescription.create",
    entityType: "Prescription",
    entityId: rx.id,
  });

  revalidatePath("/patients");
  return rx;
}

export async function listDrugsForSelect() {
  const session = await auth();
  if (!session?.user?.organizationId) return [];
  return prisma.drug.findMany({
    where: {
      organizationId: session.user.organizationId,
      status: "ACTIVE",
    },
    select: { id: true, genericName: true, internalCode: true },
    orderBy: { genericName: "asc" },
  });
}
