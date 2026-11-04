import { z } from "zod";
import { PaymentMethod } from "@prisma/client";

export const saleLineInputSchema = z.object({
  drugId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  useInsurancePrice: z.boolean().optional(),
  instructions: z.string().max(2000).optional().nullable(),
});

export const paymentInputSchema = z.object({
  method: z.nativeEnum(PaymentMethod),
  amount: z.coerce.number().positive(),
  mpesaPhone: z.string().optional().nullable(),
  mpesaManualType: z.enum(["PAYBILL", "TILL"]).optional().nullable(),
  mpesaManualRef: z.string().optional().nullable(),
  mpesaBusinessNumber: z.string().optional().nullable(),
  insuranceMemberRef: z.string().optional().nullable(),
  insurancePolicyRef: z.string().optional().nullable(),
  insuranceSchemeId: z.string().optional().nullable(),
});

export const createSaleSchema = z.object({
  patientId: z.string().optional().nullable(),
  prescriberName: z.string().max(256).optional().nullable(),
  rxNumber: z.string().max(128).optional().nullable(),
  applyTax: z.boolean().optional().default(true),
  discountCodes: z.array(z.string().min(1)).optional().default([]),
  lines: z.array(saleLineInputSchema).min(1),
  payments: z.array(paymentInputSchema).min(1),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
