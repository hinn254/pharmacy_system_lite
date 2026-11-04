import { z } from "zod";

export const insuranceSchemeInputSchema = z.object({
  name: z.string().min(1).max(256),
  code: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[A-Za-z0-9_-]+$/, "Use letters, numbers, hyphens, or underscores"),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: z.string().max(64).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  isActive: z.boolean().optional(),
});
