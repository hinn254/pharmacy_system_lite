import { z } from "zod";
import { DrugStatus, PrescriptionClass } from "@prisma/client";

const optEmpty = (s: z.ZodString) =>
  z.preprocess(
    (v) => (v === "" || v === undefined ? null : v),
    s.nullable().optional(),
  );

const optNum = z.preprocess((v) => {
  if (v === "" || v === undefined || v === null) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}, z.number().nullable().optional());

const optNonNegNum = z.preprocess((v) => {
  if (v === "" || v === undefined || v === null) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}, z.number().nonnegative().nullable().optional());

export const drugFormSchema = z.object({
  internalCode: z.string().min(1).max(64),
  barcode: optEmpty(z.string().max(128)),
  genericName: z.string().min(1).max(256),
  brandName: optEmpty(z.string().max(256)),
  dosageForm: z.string().min(1).max(128),
  strengthValue: optEmpty(z.string().max(64)),
  strengthUnit: optEmpty(z.string().max(32)),
  routeOfAdmin: optEmpty(z.string().max(64)),
  packDescription: optEmpty(z.string().max(256)),
  unitsPerPack: z.preprocess((v) => {
    if (v === "" || v === undefined || v === null) return null;
    const n = parseInt(String(v), 10);
    return Number.isNaN(n) ? null : n;
  }, z.number().int().positive().nullable().optional()),
  therapeuticCategory: optEmpty(z.string().max(128)),
  categoryIds: z.array(z.string().cuid()).optional().default([]),
  atcCode: optEmpty(z.string().max(32)),
  prescriptionClass: z.nativeEnum(PrescriptionClass),
  controlledSchedule: optEmpty(z.string().max(64)),
  manufacturer: optEmpty(z.string().max(256)),
  mahDistributor: optEmpty(z.string().max(256)),
  countryOfOrigin: optEmpty(z.string().max(128)),
  storageConditions: optEmpty(z.string().max(256)),
  patientDirections: z.string().max(2000),
  priceCash: z.coerce.number().nonnegative(),
  priceInsurance: z.coerce.number().nonnegative(),
  buyingPrice: optNonNegNum,
  costLast: optNum,
  reorderLevel: z.preprocess((v) => {
    if (v === "" || v === undefined || v === null) return null;
    const n = parseInt(String(v), 10);
    return Number.isNaN(n) ? null : n;
  }, z.number().int().nonnegative().nullable().optional()),
  maxStock: z.preprocess((v) => {
    if (v === "" || v === undefined || v === null) return null;
    const n = parseInt(String(v), 10);
    return Number.isNaN(n) ? null : n;
  }, z.number().int().nonnegative().nullable().optional()),
  status: z.nativeEnum(DrugStatus),
});

export type DrugFormValues = z.infer<typeof drugFormSchema>;
