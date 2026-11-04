import { z } from "zod";

export const supplierInputSchema = z.object({
  name: z.string().min(1).max(256),
  phone: z.string().max(64).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  address: z.string().max(512).optional().nullable(),
  speciality: z.string().max(256).optional().nullable(),
});
