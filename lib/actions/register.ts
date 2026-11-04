"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Prisma, UserRole } from "@prisma/client";
import { z } from "zod";
import { slugify } from "@/lib/slugify";

const registerSchema = z.object({
  pharmacyName: z.string().min(2).max(128),
  slug: z
    .string()
    .max(80)
    .optional()
    .transform((s) => (s?.trim() ? s : undefined)),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().max(128).optional().nullable(),
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

  const slugBase = data.slug ? slugify(data.slug) : slugify(data.pharmacyName);

  try {
    await prisma.$transaction(async (tx) => {
      const slug = await allocateUniqueSlug(tx, slugBase);
      const passwordHash = await bcrypt.hash(data.password, 12);
      const receiptHeader = data.pharmacyName.trim();

      await tx.organization.create({
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
          users: {
            create: {
              email,
              passwordHash,
              name: data.name?.trim() || null,
              role: UserRole.ADMIN,
            },
          },
        },
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
