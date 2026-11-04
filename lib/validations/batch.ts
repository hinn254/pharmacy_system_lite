import { z } from "zod";

export const batchFormSchema = z.object({
  drugId: z.string().min(1),
  batchNumber: z.string().min(1).max(128),
  expiryDate: z.string().min(1),
  quantityOnHand: z.coerce.number().int().nonnegative(),
  supplierId: z.string().optional().nullable(),
  purchaseRef: z.string().max(128).optional().nullable(),
  unitCost: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? null : v),
    z.coerce.number().nonnegative().nullable(),
  ),
});

export type BatchFormValues = z.infer<typeof batchFormSchema>;

export const batchDeleteSchema = z.object({
  reason: z.string().trim().min(3, "Reason is required").max(500),
});

export type BatchDeleteValues = z.infer<typeof batchDeleteSchema>;
