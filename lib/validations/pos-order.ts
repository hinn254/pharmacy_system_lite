import { z } from "zod";
import { MpesaManualType, PaymentMethod } from "@prisma/client";
import { saleLineInputSchema, paymentInputSchema } from "@/lib/validations/sale";
import { normalizeKenyaMsisdn } from "@/lib/phone";

/** Shape stored on `PosOrder.paymentQueueSnapshot` and returned to the cashier UI. */
export type PaymentQueueSnapshot = {
  mpesaPhone?: string | null;
  mpesaManualType?: MpesaManualType | null;
  mpesaManualRef?: string | null;
  mpesaBusinessNumber?: string | null;
  insuranceMemberRef?: string | null;
  insurancePolicyRef?: string | null;
};

export const paymentQueueSnapshotSchema = z
  .object({
    mpesaPhone: z.string().max(40).optional().nullable(),
    mpesaManualType: z.nativeEnum(MpesaManualType).optional().nullable(),
    mpesaManualRef: z.string().max(128).optional().nullable(),
    mpesaBusinessNumber: z.string().max(64).optional().nullable(),
    insuranceMemberRef: z.string().max(256).optional().nullable(),
    insurancePolicyRef: z.string().max(256).optional().nullable(),
  })
  .strict()
  .optional()
  .nullable();

export const createPosOrderSchema = z
  .object({
    patientId: z.string().optional().nullable(),
    applyTax: z.boolean().optional().default(true),
    discountCodes: z.array(z.string().min(1)).optional().default([]),
    prescriptionPhotoUrl: z.string().url().optional().nullable(),
    selectedPaymentMethod: z.nativeEnum(PaymentMethod),
    selectedInsuranceSchemeId: z.string().optional().nullable(),
    paymentQueueSnapshot: paymentQueueSnapshotSchema,
    lines: z.array(saleLineInputSchema).min(1),
  })
  .superRefine((data, ctx) => {
    const method = data.selectedPaymentMethod;
    const snap = data.paymentQueueSnapshot;

    if (method === PaymentMethod.INSURANCE) {
      if (!data.selectedInsuranceSchemeId?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "Select an insurance scheme for insurance orders.",
          path: ["selectedInsuranceSchemeId"],
        });
      }
      if (!snap?.insuranceMemberRef?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "Enter member or beneficiary ID for insurance orders.",
          path: ["paymentQueueSnapshot", "insuranceMemberRef"],
        });
      }
    }

    if (method === PaymentMethod.MPESA_STK) {
      const raw = snap?.mpesaPhone;
      if (!normalizeKenyaMsisdn(typeof raw === "string" ? raw : "")) {
        ctx.addIssue({
          code: "custom",
          message: "Enter a valid M-Pesa number (e.g. 07… or 2547…).",
          path: ["paymentQueueSnapshot", "mpesaPhone"],
        });
      }
    }

    if (method === PaymentMethod.MPESA_MANUAL) {
      if (!snap?.mpesaManualRef?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "Enter the M-Pesa confirmation code from the SMS.",
          path: ["paymentQueueSnapshot", "mpesaManualRef"],
        });
      }
      if (!snap?.mpesaBusinessNumber?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "Enter the Paybill or Till number used for this payment.",
          path: ["paymentQueueSnapshot", "mpesaBusinessNumber"],
        });
      }
    }
  });

export type CreatePosOrderInput = z.infer<typeof createPosOrderSchema>;

export const finalizePosOrderSchema = z.object({
  posOrderId: z.string().min(1),
  payments: z.array(paymentInputSchema).min(1),
});

export type FinalizePosOrderInput = z.infer<typeof finalizePosOrderSchema>;
