import { z } from "zod";
import { createSaleSchema } from "@/lib/validations/sale";

export const createSaleFromConsultationSchema = createSaleSchema
  .omit({ patientId: true, lines: true })
  .extend({
    caseId: z.string().min(1),
  });

