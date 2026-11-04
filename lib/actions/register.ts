"use server";

import { prisma } from "@/lib/prisma";
import { Prisma, UserRole } from "@prisma/client";
import { z } from "zod";
import { slugify } from "@/lib/slugify";
import { createCredentialUser } from "@/lib/auth-users";
import { normalizeKenyaMsisdn } from "@/lib/phone";

const registerSchema = z.object({
  pharmacyName: z.string().min(2).max(128),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(2).max(128),
  phoneNumber: z
    .string()
    .trim()
    .min(1, "Enter your phone number.")
    .refine(
      (value) => normalizeKenyaMsisdn(value) !== null,
      "Enter a valid Kenyan mobile number, such as 0712 345 678.",
    ),
});

export type RegisterInput = z.infer<typeof registerSchema>;

async function allocateUniqueSlug(
  tx: Prisma.TransactionClient,
  baseRaw: string,
): Promise<string> {
  const base = slugify(baseRaw).slice(0, 80) || "pharmacy";
  let counter = 0;
  for (;;) {
    const candidate =
      counter === 0
        ? base
        : `${base}-${counter}`.slice(0, 80);
    const exists = await tx.organization.findUnique({
      where: { slug: candidate },
    });
    if (!exists) return candidate;
    counter++;
    if (counter > 1000) throw new Error("Could not allocate a unique pharmacy URL");
  }
}

export type RegisterResult =
  | { ok: true }
  | { ok: false; error: string; code?: "EMAIL_TAKEN" | "DISABLED" | "VALIDATION" };

export async function registerOrganization(
  input: unknown,
): Promise<RegisterResult> {
  if (process.env.ALLOW_PUBLIC_REGISTRATION === "false") {
    return { ok: false, error: "Registration is disabled.", code: "DISABLED" };
  }

  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
      code: "VALIDATION",
    };
  }

  const data = parsed.data;
  const email = data.email.toLowerCase().trim();
  const phoneNumber = normalizeKenyaMsisdn(data.phoneNumber);
  if (!phoneNumber) {
    return {
      ok: false,
      error: "Enter a valid Kenyan mobile number, such as 0712 345 678.",
      code: "VALIDATION",
    };
  }

  const emailTaken = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (emailTaken) {
    return {
      ok: false,
      error: "An account with this email already exists.",
      code: "EMAIL_TAKEN",
    };
  }

  const slugBase = slugify(data.pharmacyName);

  try {
    await prisma.$transaction(async (tx) => {
      const slug = await allocateUniqueSlug(tx, slugBase);
      const receiptHeader = data.pharmacyName.trim();

      const organization = await tx.organization.create({
        data: {
          name: data.pharmacyName.trim(),
          slug,
          settings: {
            create: {
              taxRatePercent: new Prisma.Decimal(16),
              receiptHeader,
              receiptFooter: "Thank you for your business",
              defaultLowStockDays: 90,
              mpesaEnvironment: "sandbox",
              insuranceNotes: null,
            },
          },
        },
      });
      await createCredentialUser(tx, {
        email,
        password: data.password,
        name: data.name.trim(),
        phoneNumber,
        role: UserRole.ADMIN,
        organizationId: organization.id,
      });
    });
  } catch (e) {
    console.error("[registerOrganization]", e);
    return {
      ok: false,
      error: "Could not create your pharmacy. Please try again.",
    };
  }

  return { ok: true };
}
