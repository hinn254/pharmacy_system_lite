import {
  PrismaClient,
  Prisma,
  UserRole,
  PrescriptionClass,
  DrugStatus,
  PaymentMethod,
  PaymentStatus,
  SaleStatus,
  StockMovementType,
  EtimsComplianceStatus,
  MpesaManualType,
  InsuranceInvoiceStatus,
  SupplierBillStatus,
  SupplierPaymentMethod,
  ExpenseCategory,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_DEMO_PASSWORD } from "../lib/demo-credentials";

const prisma = new PrismaClient();

/**
 * One password for all demo users. Override for a run:
 * `SEED_DEMO_PASSWORD='...' npm run db:seed`
 */
const SEED_DEMO_PASSWORD =
  process.env.SEED_DEMO_PASSWORD ?? DEFAULT_DEMO_PASSWORD;

/** FEFO allocation inside a transaction (same rules as lib/fefo). */
async function allocateFefo(
  tx: Prisma.TransactionClient,
  organizationId: string,
  drugId: string,
  quantity: number,
): Promise<{ batchId: string; quantity: number }[]> {
  if (quantity <= 0) return [];
  const batches = await tx.drugBatch.findMany({
    where: { organizationId, drugId, quantityOnHand: { gt: 0 } },
    orderBy: { expiryDate: "asc" },
  });
  let remaining = quantity;
  const out: { batchId: string; quantity: number }[] = [];
  for (const b of batches) {
    if (remaining <= 0) break;
    const take = Math.min(b.quantityOnHand, remaining);
    if (take > 0) {
      out.push({ batchId: b.id, quantity: take });
      remaining -= take;
    }
  }
  if (remaining > 0) {
    throw new Error(`FEFO short for drug ${drugId}: need ${quantity}, missing ${remaining}`);
  }
  return out;
}

async function clearOrgInventoryAndSales(orgId: string) {
  await prisma.$transaction([
    // New lightweight finance modules (delete first because they reference payments/suppliers)
    prisma.insuranceInvoicePayment.deleteMany({
      where: { insuranceInvoice: { organizationId: orgId } },
    }),
    prisma.insuranceInvoiceLine.deleteMany({
      where: { insuranceInvoice: { organizationId: orgId } },
    }),
    prisma.insuranceInvoice.deleteMany({ where: { organizationId: orgId } }),

    prisma.supplierPaymentAllocation.deleteMany({
      where: { supplierBill: { organizationId: orgId } },
    }),
    prisma.supplierPayment.deleteMany({ where: { organizationId: orgId } }),
    prisma.supplierBill.deleteMany({ where: { organizationId: orgId } }),

    prisma.expense.deleteMany({ where: { organizationId: orgId } }),

    prisma.aiChatLog.deleteMany({ where: { organizationId: orgId } }),
    prisma.offlineSyncQueue.deleteMany({ where: { organizationId: orgId } }),
    prisma.mpesaTransaction.deleteMany({ where: { organizationId: orgId } }),
    prisma.consultationCheckout.deleteMany({ where: { organizationId: orgId } }),
    prisma.consultationMedicationOrder.deleteMany({ where: { organizationId: orgId } }),
    prisma.consultationEncounter.deleteMany({ where: { organizationId: orgId } }),
    prisma.consultationCase.deleteMany({ where: { organizationId: orgId } }),
    prisma.doctorProfile.deleteMany({ where: { organizationId: orgId } }),

    prisma.posOrderLine.deleteMany({
      where: { posOrder: { organizationId: orgId } },
    }),
    prisma.posOrder.deleteMany({ where: { organizationId: orgId } }),

    prisma.sale.deleteMany({ where: { organizationId: orgId } }),
    prisma.stockMovement.deleteMany({ where: { organizationId: orgId } }),
    prisma.drugCategoryOnDrug.deleteMany({
      where: { drug: { organizationId: orgId } },
    }),
    prisma.drugCategory.deleteMany({ where: { organizationId: orgId } }),
    prisma.prescriptionItem.deleteMany({
      where: { prescription: { patient: { organizationId: orgId } } },
    }),
    prisma.prescription.deleteMany({
      where: { patient: { organizationId: orgId } },
    }),
    prisma.patient.deleteMany({ where: { organizationId: orgId } }),
    prisma.drugBatch.deleteMany({ where: { organizationId: orgId } }),
    prisma.drug.deleteMany({ where: { organizationId: orgId } }),
    prisma.supplier.deleteMany({ where: { organizationId: orgId } }),
    prisma.promoCampaign.deleteMany({ where: { organizationId: orgId } }),
    prisma.auditLog.deleteMany({ where: { organizationId: orgId } }),
    prisma.insuranceScheme.deleteMany({ where: { organizationId: orgId } }),
  ]);
}

type LineInput = { drugId: string; quantity: number; useInsurance: boolean };

function slugifyCategoryName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function createSaleWithFefo(params: {
  tx: Prisma.TransactionClient;
  orgId: string;
  saleNumber: number;
  createdById: string;
  createdAt: Date;
  patientId: string | null;
  lines: LineInput[];
  paymentMethod: PaymentMethod;
  paymentExtra?: {
    mpesaPhone?: string;
    mpesaManualType?: MpesaManualType;
    mpesaManualRef?: string;
    mpesaBusinessNumber?: string;
    mpesaCheckoutRequestId?: string;
    mpesaReceiptNumber?: string;
    insuranceMemberRef?: string;
    insurancePolicyRef?: string;
    insuranceSchemeId?: string | null;
  };
  etimsStatus?: EtimsComplianceStatus;
}) {
  const {
    tx,
    orgId,
    saleNumber,
    createdById,
    createdAt,
    patientId,
    lines,
    paymentMethod,
    paymentExtra,
    etimsStatus = EtimsComplianceStatus.NOT_APPLICABLE,
  } = params;

  const settings = await tx.organizationSettings.findUnique({
    where: { orgId },
  });
  const taxRate = settings
    ? new Prisma.Decimal(settings.taxRatePercent).div(100)
    : new Prisma.Decimal(0.16);

  let subtotal = new Prisma.Decimal(0);
  const linePayloads: {
    drugId: string;
    quantity: number;
    unitPrice: Prisma.Decimal;
    lineTotal: Prisma.Decimal;
    useInsurance: boolean;
    allocations: { batchId: string; quantity: number }[];
  }[] = [];

  for (const line of lines) {
    const drug = await tx.drug.findFirst({
      where: { id: line.drugId, organizationId: orgId },
    });
    if (!drug) throw new Error(`Drug ${line.drugId} not found`);
    const unitPrice = line.useInsurance ? drug.priceInsurance : drug.priceCash;
    const lineTotal = new Prisma.Decimal(unitPrice).mul(line.quantity);
    subtotal = subtotal.add(lineTotal);
    const allocations = await allocateFefo(tx, orgId, line.drugId, line.quantity);
    linePayloads.push({
      drugId: line.drugId,
      quantity: line.quantity,
      unitPrice: new Prisma.Decimal(unitPrice),
      lineTotal,
      useInsurance: line.useInsurance,
      allocations,
    });
  }

  const taxAmount = subtotal.mul(taxRate);
  const total = subtotal.add(taxAmount);

  const sale = await tx.sale.create({
    data: {
      organizationId: orgId,
      saleNumber,
      patientId,
      subtotal,
      taxAmount,
      total,
      status: SaleStatus.COMPLETED,
      createdById,
      createdAt,
      updatedAt: createdAt,
      etimsStatus,
      taxableAmount: subtotal,
      taxRateSnapshot: taxRate.mul(100),
      kraInvoiceNumber:
        etimsStatus !== EtimsComplianceStatus.NOT_APPLICABLE
          ? `KRA-DEMO-${saleNumber}`
          : null,
    },
  });

  for (const lp of linePayloads) {
    const sl = await tx.saleLine.create({
      data: {
        saleId: sale.id,
        drugId: lp.drugId,
        quantity: lp.quantity,
        unitPrice: lp.unitPrice,
        lineTotal: lp.lineTotal,
        usedInsurancePrice: lp.useInsurance,
      },
    });
    for (const alloc of lp.allocations) {
      await tx.saleLineBatch.create({
        data: {
          saleLineId: sl.id,
          batchId: alloc.batchId,
          quantity: alloc.quantity,
        },
      });
      await tx.drugBatch.update({
        where: { id: alloc.batchId },
        data: { quantityOnHand: { decrement: alloc.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          organizationId: orgId,
          type: StockMovementType.SALE,
          drugId: lp.drugId,
          batchId: alloc.batchId,
          quantity: -alloc.quantity,
          saleId: sale.id,
          createdById,
          createdAt,
        },
      });
    }
  }

  await tx.payment.create({
    data: {
      saleId: sale.id,
      method: paymentMethod,
      amount: total,
      status:
        paymentMethod === PaymentMethod.INSURANCE
          ? PaymentStatus.PENDING
          : PaymentStatus.COMPLETED,
      mpesaCheckoutRequestId: paymentExtra?.mpesaCheckoutRequestId ?? null,
      mpesaReceiptNumber: paymentExtra?.mpesaReceiptNumber ?? null,
      mpesaPhoneNumber: paymentExtra?.mpesaPhone ?? null,
      mpesaManualType: paymentExtra?.mpesaManualType ?? null,
      mpesaManualRef: paymentExtra?.mpesaManualRef ?? null,
      mpesaBusinessNumber: paymentExtra?.mpesaBusinessNumber ?? null,
      insuranceMemberRef: paymentExtra?.insuranceMemberRef ?? null,
      insurancePolicyRef: paymentExtra?.insurancePolicyRef ?? null,
      insuranceSchemeId: paymentExtra?.insuranceSchemeId ?? null,
      createdAt,
    },
  });

  return sale;
}

async function voidSaleAndRestock(params: {
  tx: Prisma.TransactionClient;
  orgId: string;
  saleId: string;
  voidedById: string;
  voidedAt: Date;
  voidReason: string;
}) {
  const { tx, orgId, saleId, voidedById, voidedAt, voidReason } = params;

  const sale = await tx.sale.findFirst({
    where: { id: saleId, organizationId: orgId },
    include: {
      lines: { include: { batchAllocations: true } },
    },
  });
  if (!sale) throw new Error(`Sale ${saleId} not found for void`);
  if (sale.status === SaleStatus.VOIDED) return;

  for (const line of sale.lines) {
    for (const alloc of line.batchAllocations) {
      await tx.drugBatch.update({
        where: { id: alloc.batchId },
        data: { quantityOnHand: { increment: alloc.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          organizationId: orgId,
          type: StockMovementType.VOID_RESTOCK,
          drugId: line.drugId,
          batchId: alloc.batchId,
          quantity: alloc.quantity,
          reason: `Sale void: ${voidReason}`,
          saleId: saleId,
          createdById: voidedById,
          createdAt: voidedAt,
        },
      });
    }
  }

  await tx.sale.update({
    where: { id: saleId },
    data: {
      status: SaleStatus.VOIDED,
      voidReason,
      voidedAt,
      voidedById,
      updatedAt: voidedAt,
    },
  });
}

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: "main-pharmacy" },
    update: {
      name: "Nairobi Central Pharmacy",
    },
    create: {
      name: "Nairobi Central Pharmacy",
      slug: "main-pharmacy",
      settings: {
        create: {
          // Keep math simple for analytics checks: totals == subtotals (no VAT).
          taxRatePercent: new Prisma.Decimal(0),
          receiptHeader: "Nairobi Central Pharmacy",
          receiptFooter: "Asante — your health, our priority",
          defaultLowStockDays: 90,
          mpesaEnvironment: "sandbox",
          insuranceNotes: "NHIF / private insurers — verify member at POS",
        },
      },
    },
    include: { settings: true },
  });

  await clearOrgInventoryAndSales(org.id);

  const demoPasswordHash = await bcrypt.hash(SEED_DEMO_PASSWORD, 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@pharmacy.local" },
    update: { passwordHash: demoPasswordHash },
    create: {
      email: "admin@pharmacy.local",
      passwordHash: demoPasswordHash,
      name: "Mary Wanjiku",
      role: UserRole.ADMIN,
      organizationId: org.id,
    },
  });

  const cashier = await prisma.user.upsert({
    where: { email: "cashier@pharmacy.local" },
    update: { passwordHash: demoPasswordHash },
    create: {
      email: "cashier@pharmacy.local",
      passwordHash: demoPasswordHash,
      name: "James Omondi",
      role: UserRole.CASHIER,
      organizationId: org.id,
    },
  });

  const pharmTech = await prisma.user.upsert({
    where: { email: "pharmtech@pharmacy.local" },
    update: { passwordHash: demoPasswordHash },
    create: {
      email: "pharmtech@pharmacy.local",
      passwordHash: demoPasswordHash,
      name: "Grace Akinyi",
      role: UserRole.PHARM_TECH,
      organizationId: org.id,
    },
  });

  const doctor = await prisma.user.upsert({
    where: { email: "doctor@pharmacy.local" },
    update: { passwordHash: demoPasswordHash, role: UserRole.DOCTOR, organizationId: org.id },
    create: {
      email: "doctor@pharmacy.local",
      passwordHash: demoPasswordHash,
      name: "Dr. Anne Ochieng",
      role: UserRole.DOCTOR,
      organizationId: org.id,
    },
  });

  await prisma.doctorProfile.upsert({
    where: { userId: doctor.id },
    update: {
      organizationId: org.id,
      speciality: "General practice",
      consultFeeCash: new Prisma.Decimal(300),
      consultFeeInsurance: new Prisma.Decimal(500),
      isActive: true,
    },
    create: {
      organizationId: org.id,
      userId: doctor.id,
      speciality: "General practice",
      consultFeeCash: new Prisma.Decimal(300),
      consultFeeInsurance: new Prisma.Decimal(500),
      isActive: true,
    },
  });

  const suppliers = await Promise.all([
    prisma.supplier.create({
      data: {
        organizationId: org.id,
        name: "KEMSA Supplies",
        phone: "+254700111222",
        email: "orders@kemsa.example",
        address: "Nairobi",
        speciality: "Public sector & essential medicines",
      },
    }),
    prisma.supplier.create({
      data: {
        organizationId: org.id,
        name: "MedSource Distributors",
        phone: "+254733444555",
        email: "sales@medsource.example",
        address: "Mombasa Rd",
        speciality: "Generics & OTC",
      },
    }),
    prisma.supplier.create({
      data: {
        organizationId: org.id,
        name: "ColdChain Pharma Ltd",
        phone: "+254722999888",
        email: "cold@example.com",
        address: "Westlands",
        speciality: "Cold chain & biologics",
      },
    }),
  ]);

  // Keep categories small + readable for analytics “category mix”.
  const defaultCategoryNames = [
    "Pain relief",
    "Antibiotics",
    "Allergy",
    "Gastrointestinal",
    "Diabetes",
    "Respiratory",
    "Antifungals",
    "Other",
  ];

  const categoryBySlug = new Map<string, { id: string; name: string }>();
  for (const name of defaultCategoryNames) {
    const slug = slugifyCategoryName(name);
    if (!slug || categoryBySlug.has(slug)) continue;
    const c = await prisma.drugCategory.upsert({
      where: { organizationId_slug: { organizationId: org.id, slug } },
      update: { name },
      create: { organizationId: org.id, name, slug },
      select: { id: true, name: true, slug: true },
    });
    categoryBySlug.set(c.slug, { id: c.id, name: c.name });
  }

  const schemeNhif = await prisma.insuranceScheme.upsert({
    where: {
      organizationId_code: { organizationId: org.id, code: "NHIF" },
    },
    create: {
      organizationId: org.id,
      name: "NHIF",
      code: "NHIF",
      email: "info@nhif.or.ke",
      phone: "0800720600",
      notes: "National Health Insurance Fund — verify member number at POS",
      isActive: true,
    },
    update: {
      name: "NHIF",
      email: "info@nhif.or.ke",
      phone: "0800720600",
    },
  });
  const schemeUap = await prisma.insuranceScheme.upsert({
    where: {
      organizationId_code: { organizationId: org.id, code: "UAP" },
    },
    create: {
      organizationId: org.id,
      name: "UAP Old Mutual",
      code: "UAP",
      email: "claims@oldmutual.co.ke",
      phone: "+254709123456",
      notes: "Private insurer — pre-auth may be required",
      isActive: true,
    },
    update: {
      name: "UAP Old Mutual",
      email: "claims@oldmutual.co.ke",
    },
  });
  await prisma.insuranceScheme.upsert({
    where: {
      organizationId_code: { organizationId: org.id, code: "BRITAM" },
    },
    create: {
      organizationId: org.id,
      name: "Britam Insurance",
      code: "BRITAM",
      email: "health@britam.com",
      phone: "+254202841000",
      notes: "Medical cover — corporate and retail",
      isActive: true,
    },
    update: {
      name: "Britam Insurance",
      email: "health@britam.com",
      phone: "+254202841000",
    },
  });
  await prisma.insuranceScheme.upsert({
    where: {
      organizationId_code: { organizationId: org.id, code: "LEGACY" },
    },
    create: {
      organizationId: org.id,
      name: "Former partner (inactive demo)",
      code: "LEGACY",
      email: "archive@example.com",
      phone: null,
      notes: "Inactive — hidden at POS; kept for migration / history demos",
      isActive: false,
    },
    update: {
      isActive: false,
    },
  });

  const days = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);
  const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
  const atHour = (d: Date, hour: number) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour, 0, 0, 0);

  type DrugDef = {
    internalCode: string;
    barcode?: string | null;
    genericName: string;
    brandName?: string | null;
    dosageForm: string;
    strengthValue?: string | null;
    strengthUnit?: string | null;
    routeOfAdmin?: string | null;
    packDescription?: string | null;
    unitsPerPack?: number | null;
    therapeuticCategory?: string | null;
    atcCode?: string | null;
    prescriptionClass: PrescriptionClass;
    controlledSchedule?: string | null;
    manufacturer?: string | null;
    mahDistributor?: string | null;
    countryOfOrigin?: string | null;
    storageConditions?: string | null;
    patientDirections?: string;
    priceCash: Prisma.Decimal;
    priceInsurance: Prisma.Decimal;
    costLast: Prisma.Decimal;
    reorderLevel: number | null;
    maxStock?: number | null;
    status: DrugStatus;
    batches: {
      lot: string;
      qty: number;
      expiry: Date;
      supplierIdx: number;
      cost: Prisma.Decimal;
    }[];
  };

  // Exactly 10 drugs, round numbers, easy to audit on analytics screens.
  // Prices are per unit (not per pack) as used in POS.
  const drugDefs: DrugDef[] = [
    {
      internalCode: "PAR-500",
      genericName: "Paracetamol 500 mg",
      dosageForm: "Tablet",
      therapeuticCategory: "Pain relief",
      prescriptionClass: PrescriptionClass.OTC,
      priceCash: new Prisma.Decimal(10),
      priceInsurance: new Prisma.Decimal(12),
      costLast: new Prisma.Decimal(6),
      reorderLevel: 30,
      status: DrugStatus.ACTIVE,
      batches: [
        { lot: "PAR-A", qty: 60, expiry: days(90), supplierIdx: 0, cost: new Prisma.Decimal(6) },
        { lot: "PAR-B", qty: 40, expiry: days(180), supplierIdx: 0, cost: new Prisma.Decimal(6) },
      ],
    },
    {
      internalCode: "IBU-200",
      genericName: "Ibuprofen 200 mg",
      dosageForm: "Tablet",
      therapeuticCategory: "Pain relief",
      prescriptionClass: PrescriptionClass.OTC,
      priceCash: new Prisma.Decimal(15),
      priceInsurance: new Prisma.Decimal(18),
      costLast: new Prisma.Decimal(9),
      reorderLevel: 30,
      status: DrugStatus.ACTIVE,
      batches: [{ lot: "IBU-A", qty: 100, expiry: days(200), supplierIdx: 0, cost: new Prisma.Decimal(9) }],
    },
    {
      internalCode: "AMOX-250",
      genericName: "Amoxicillin 250 mg",
      dosageForm: "Capsule",
      therapeuticCategory: "Antibiotics",
      prescriptionClass: PrescriptionClass.RX,
      priceCash: new Prisma.Decimal(50),
      priceInsurance: new Prisma.Decimal(60),
      costLast: new Prisma.Decimal(30),
      reorderLevel: 40,
      status: DrugStatus.ACTIVE,
      batches: [
        { lot: "AMX-A", qty: 30, expiry: days(60), supplierIdx: 1, cost: new Prisma.Decimal(30) },
        { lot: "AMX-B", qty: 20, expiry: days(150), supplierIdx: 1, cost: new Prisma.Decimal(30) },
      ],
    },
    {
      internalCode: "CET-10",
      genericName: "Cetirizine 10 mg",
      dosageForm: "Tablet",
      therapeuticCategory: "Allergy",
      prescriptionClass: PrescriptionClass.OTC,
      priceCash: new Prisma.Decimal(20),
      priceInsurance: new Prisma.Decimal(25),
      costLast: new Prisma.Decimal(10),
      reorderLevel: 10,
      status: DrugStatus.ACTIVE,
      batches: [{ lot: "CET-A", qty: 40, expiry: days(120), supplierIdx: 0, cost: new Prisma.Decimal(10) }],
    },
    {
      internalCode: "ORS-SACH",
      genericName: "Oral rehydration salts (sachet)",
      dosageForm: "Powder sachet",
      therapeuticCategory: "Other",
      prescriptionClass: PrescriptionClass.OTC,
      priceCash: new Prisma.Decimal(15),
      priceInsurance: new Prisma.Decimal(18),
      costLast: new Prisma.Decimal(8),
      reorderLevel: 20,
      status: DrugStatus.ACTIVE,
      batches: [{ lot: "ORS-A", qty: 60, expiry: days(300), supplierIdx: 0, cost: new Prisma.Decimal(8) }],
    },
    {
      internalCode: "MET-500",
      genericName: "Metformin 500 mg",
      dosageForm: "Tablet",
      therapeuticCategory: "Diabetes",
      prescriptionClass: PrescriptionClass.RX,
      priceCash: new Prisma.Decimal(12),
      priceInsurance: new Prisma.Decimal(15),
      costLast: new Prisma.Decimal(7),
      reorderLevel: 20,
      status: DrugStatus.ACTIVE,
      batches: [{ lot: "MET-A", qty: 80, expiry: days(220), supplierIdx: 1, cost: new Prisma.Decimal(7) }],
    },
    {
      internalCode: "OMP-20",
      genericName: "Omeprazole 20 mg",
      dosageForm: "Capsule",
      therapeuticCategory: "Gastrointestinal",
      prescriptionClass: PrescriptionClass.RX,
      priceCash: new Prisma.Decimal(30),
      priceInsurance: new Prisma.Decimal(35),
      costLast: new Prisma.Decimal(18),
      reorderLevel: 10,
      status: DrugStatus.ACTIVE,
      batches: [{ lot: "OMP-A", qty: 40, expiry: days(260), supplierIdx: 1, cost: new Prisma.Decimal(18) }],
    },
    {
      internalCode: "SAL-INH",
      genericName: "Salbutamol inhaler",
      dosageForm: "Inhaler",
      therapeuticCategory: "Respiratory",
      prescriptionClass: PrescriptionClass.RX,
      priceCash: new Prisma.Decimal(250),
      priceInsurance: new Prisma.Decimal(280),
      costLast: new Prisma.Decimal(150),
      reorderLevel: 5,
      status: DrugStatus.ACTIVE,
      batches: [{ lot: "SAL-A", qty: 20, expiry: days(180), supplierIdx: 2, cost: new Prisma.Decimal(150) }],
    },
    {
      internalCode: "FLU-150",
      genericName: "Fluconazole 150 mg",
      dosageForm: "Capsule",
      therapeuticCategory: "Antifungals",
      prescriptionClass: PrescriptionClass.RX,
      priceCash: new Prisma.Decimal(60),
      priceInsurance: new Prisma.Decimal(70),
      costLast: new Prisma.Decimal(40),
      reorderLevel: 8,
      status: DrugStatus.ACTIVE,
      batches: [{ lot: "FLU-A", qty: 30, expiry: days(300), supplierIdx: 1, cost: new Prisma.Decimal(40) }],
    },
    {
      internalCode: "INS-GLAR",
      genericName: "Insulin glargine (pen)",
      dosageForm: "Injection",
      therapeuticCategory: "Diabetes",
      prescriptionClass: PrescriptionClass.RX,
      priceCash: new Prisma.Decimal(3000),
      priceInsurance: new Prisma.Decimal(3200),
      costLast: new Prisma.Decimal(2300),
      reorderLevel: 8,
      status: DrugStatus.ACTIVE,
      batches: [
        { lot: "INS-A", qty: 6, expiry: days(45), supplierIdx: 2, cost: new Prisma.Decimal(2300) },
        { lot: "INS-B", qty: 4, expiry: days(120), supplierIdx: 2, cost: new Prisma.Decimal(2300) },
      ],
    },
  ];

  const drugs: { id: string; internalCode: string }[] = [];

  for (const d of drugDefs) {
    const { batches: batchDefs, prescriptionClass: pc, ...drugData } = d;

    const drug = await prisma.drug.create({
      data: {
        organizationId: org.id,
        internalCode: drugData.internalCode,
        barcode: "barcode" in drugData ? drugData.barcode ?? null : null,
        genericName: drugData.genericName,
        brandName: "brandName" in drugData ? drugData.brandName ?? null : null,
        dosageForm: drugData.dosageForm,
        strengthValue: drugData.strengthValue ?? null,
        strengthUnit: drugData.strengthUnit ?? null,
        routeOfAdmin: drugData.routeOfAdmin ?? null,
        packDescription: drugData.packDescription ?? null,
        unitsPerPack: drugData.unitsPerPack ?? null,
        therapeuticCategory: drugData.therapeuticCategory ?? null,
        atcCode: "atcCode" in drugData ? drugData.atcCode ?? null : null,
        prescriptionClass: pc,
        controlledSchedule:
          "controlledSchedule" in drugData ? drugData.controlledSchedule ?? null : null,
        manufacturer: "manufacturer" in drugData ? drugData.manufacturer ?? null : null,
        mahDistributor: "mahDistributor" in drugData ? drugData.mahDistributor ?? null : null,
        countryOfOrigin: "countryOfOrigin" in drugData ? drugData.countryOfOrigin ?? null : null,
        storageConditions: drugData.storageConditions ?? null,
        patientDirections:
          "patientDirections" in drugData && typeof drugData.patientDirections === "string"
            ? drugData.patientDirections
            : "Take as directed by your pharmacist.",
        priceCash: drugData.priceCash,
        priceInsurance: drugData.priceInsurance,
        costLast: drugData.costLast,
        reorderLevel: drugData.reorderLevel,
        maxStock: "maxStock" in drugData ? drugData.maxStock ?? null : null,
        status: drugData.status,
      },
    });
    drugs.push({ id: drug.id, internalCode: drug.internalCode });

    // Backfill category from legacy therapeuticCategory (if it matches a known slug)
    const legacy = drugData.therapeuticCategory ?? null;
    const legacySlug = legacy ? slugifyCategoryName(legacy) : null;
    const legacyCategoryId = legacySlug
      ? categoryBySlug.get(legacySlug)?.id ?? null
      : null;
    if (legacyCategoryId) {
      await prisma.drugCategoryOnDrug.create({
        data: { drugId: drug.id, categoryId: legacyCategoryId },
      });
    } else {
      // If nothing matched and we have an explicit "Other" category, attach it for demo clarity.
      const otherId = categoryBySlug.get("other")?.id;
      if (otherId) {
        await prisma.drugCategoryOnDrug.create({
          data: { drugId: drug.id, categoryId: otherId },
        });
      }
    }

    for (const b of batchDefs) {
      const batch = await prisma.drugBatch.create({
        data: {
          organizationId: org.id,
          drugId: drug.id,
          batchNumber: b.lot,
          expiryDate: b.expiry,
          quantityOnHand: b.qty,
          supplierId: suppliers[b.supplierIdx]!.id,
          unitCost: b.cost,
          purchaseRef: `PO-${drug.internalCode}-${b.lot}`,
          receivedAt: daysAgo(14),
        },
      });
      await prisma.stockMovement.create({
        data: {
          organizationId: org.id,
          type: StockMovementType.RECEIPT,
          drugId: drug.id,
          batchId: batch.id,
          quantity: b.qty,
          reason: "Seed goods receipt",
          createdById: pharmTech.id,
          createdAt: daysAgo(14),
        },
      });
    }
  }

  const drugByCode = Object.fromEntries(drugs.map((x) => [x.internalCode, x.id])) as Record<
    string,
    string
  >;

  const patients = await Promise.all([
    prisma.patient.create({
      data: {
        organizationId: org.id,
        fullName: "Peter Mwangi",
        phone: "+254712345678",
        email: "peter.m@example.com",
        dob: daysAgo(365 * 48),
        marketingConsent: true,
        notes: "Hypertension — long-term",
      },
    }),
    prisma.patient.create({
      data: {
        organizationId: org.id,
        fullName: "Sarah Njeri",
        phone: "+254723456789",
        marketingConsent: true,
      },
    }),
    prisma.patient.create({
      data: {
        organizationId: org.id,
        fullName: "David Otieno",
        phone: "+254734567890",
        email: "d.otieno@example.com",
        marketingConsent: false,
      },
    }),
    prisma.patient.create({
      data: {
        organizationId: org.id,
        fullName: "Lucy Wambui",
        phone: "+254745678901",
        marketingConsent: true,
        notes: "Diabetes — refill metformin monthly",
      },
    }),
    prisma.patient.create({
      data: {
        organizationId: org.id,
        fullName: "Tom Kimani",
        phone: "+254756789012",
        marketingConsent: false,
      },
    }),
  ]);

  await prisma.prescription.create({
    data: {
      patientId: patients[3]!.id,
      prescriberName: "Dr. A. Ochieng",
      rxNumber: "RX-2026-001",
      issuedAt: daysAgo(20),
      refillDueAt: days(10),
      notes: "Metformin 500 mg twice daily",
      items: {
        create: [
          {
            drugId: drugByCode["MET-500"]!,
            quantity: 100,
            instructions: "With meals",
          },
        ],
      },
    },
  });

  await prisma.prescription.create({
    data: {
      patientId: patients[0]!.id,
      prescriberName: "Dr. K. Mutua",
      rxNumber: "RX-2026-014",
      issuedAt: daysAgo(5),
      refillDueAt: days(25),
      items: {
        create: [
          {
            drugId: drugByCode["AMOX-250"]!,
            quantity: 21,
            instructions: "Complete course",
          },
        ],
      },
    },
  });

  const caseAssigned = await prisma.consultationCase.create({
    data: {
      organizationId: org.id,
      patientId: patients[1]!.id,
      createdById: pharmTech.id,
      assignedDoctorId: doctor.id,
      status: "IN_CONSULT",
    },
  });

  await prisma.consultationEncounter.create({
    data: {
      organizationId: org.id,
      caseId: caseAssigned.id,
      createdById: doctor.id,
      temperatureC: new Prisma.Decimal("37.6"),
      weightKg: new Prisma.Decimal("68.2"),
      bpSystolic: 128,
      bpDiastolic: 82,
      pulseBpm: 78,
      spo2Percent: 97,
      respRate: 16,
      chiefComplaint: "Headache and mild fever (2 days)",
      assessment: "Likely viral syndrome. Rule out bacterial infection if symptoms worsen.",
      plan: "Supportive care; return if worsening. Consider antibiotics only if indicated.",
      notes: "No known drug allergies reported (seed demo).",
      createdAt: daysAgo(0),
      updatedAt: daysAgo(0),
    },
  });

  await prisma.consultationMedicationOrder.createMany({
    data: [
      {
        organizationId: org.id,
        caseId: caseAssigned.id,
        drugId: drugByCode["PAR-500"]!,
        quantity: 10,
        instructions: "1 tab every 8 hours after meals",
        status: "DRAFT",
      },
      {
        organizationId: org.id,
        caseId: caseAssigned.id,
        drugId: drugByCode["ORS-SACH"]!,
        quantity: 2,
        instructions: "Mix 1 sachet in 1L water; sip throughout the day",
        status: "DRAFT",
      },
    ],
  });

  await prisma.consultationCase.create({
    data: {
      organizationId: org.id,
      patientId: patients[4]!.id,
      createdById: pharmTech.id,
      status: "OPEN",
    },
  });

  await prisma.consultationCase.create({
    data: {
      organizationId: org.id,
      patientId: patients[0]!.id,
      createdById: pharmTech.id,
      assignedDoctorId: doctor.id,
      status: "READY_FOR_CASHIER",
      medicationOrders: {
        create: [
          {
            organizationId: org.id,
            drugId: drugByCode["IBU-200"]!,
            quantity: 20,
            instructions: "1 tab every 8 hours as needed",
            status: "SENT_TO_CASHIER",
          },
        ],
      },
    },
  });

  await prisma.promoCampaign.create({
    data: {
      organizationId: org.id,
      name: "Rainy season ORS",
      messageTemplate: "Stay hydrated — 10% off ORS this week.",
      segmentNotes: "patients with children",
      scheduledFor: days(7),
    },
  });

  await prisma.aiChatLog.createMany({
    data: [
      {
        organizationId: org.id,
        userId: admin.id,
        pageContext: "/pos",
        userMessage: "What does FEFO mean when dispensing?",
        assistantMessage:
          "FEFO (First Expired, First Out) means sell or dispense batches with the earliest expiry date first, so stock rotates safely.",
        model: "seed",
        metadata: { demo: true },
      },
      {
        organizationId: org.id,
        userId: pharmTech.id,
        pageContext: "/inventory/drugs",
        userMessage: "Where do I see batch expiry dates?",
        assistantMessage:
          "Open Batches & stock: each batch shows expiry and quantity on hand. Receipts use FEFO when you sell.",
        model: "seed",
        metadata: { demo: true },
      },
    ],
  });

  await prisma.mpesaTransaction.create({
    data: {
      organizationId: org.id,
      amount: new Prisma.Decimal(250),
      phoneNumber: "254798765432",
      status: "FAILED",
      resultCode: 1032,
      resultDesc: "Demo STK — cancelled by customer (seed)",
      initiatedById: cashier.id,
    },
  });

  await prisma.offlineSyncQueue.create({
    data: {
      organizationId: org.id,
      patientMutationId: `seed-demo-${org.id.slice(0, 8)}`,
      operation: "sale.create",
      payload: { demo: true, note: "Example queued offline payload" },
      status: "synced",
      syncedAt: daysAgo(1),
    },
  });

  const salesPlan: {
    daysAgo: number;
    patientIdx: number | null;
    lines: LineInput[];
    paymentMethod: PaymentMethod;
    extra?: Parameters<typeof createSaleWithFefo>[0]["paymentExtra"];
    etims?: EtimsComplianceStatus;
    voidAfterDays?: number;
    voidReason?: string;
  }[] = [
    {
      daysAgo: 28,
      patientIdx: 0,
      lines: [
        { drugId: drugByCode["PAR-500"]!, quantity: 10, useInsurance: false },
        { drugId: drugByCode["IBU-200"]!, quantity: 10, useInsurance: false },
      ],
      paymentMethod: PaymentMethod.CASH,
    },
    {
      daysAgo: 24,
      patientIdx: 1,
      lines: [{ drugId: drugByCode["CET-10"]!, quantity: 5, useInsurance: false }],
      paymentMethod: PaymentMethod.MPESA_MANUAL,
      extra: {
        mpesaManualType: MpesaManualType.TILL,
        mpesaManualRef: "TILL-0001",
        mpesaBusinessNumber: "123456",
      },
    },
    {
      daysAgo: 21,
      patientIdx: 0,
      lines: [{ drugId: drugByCode["AMOX-250"]!, quantity: 14, useInsurance: true }],
      paymentMethod: PaymentMethod.INSURANCE,
      extra: {
        insuranceSchemeId: schemeNhif.id,
        insuranceMemberRef: "NHIF-0001",
        insurancePolicyRef: "POL-0001",
      },
    },
    {
      daysAgo: 18,
      patientIdx: 3,
      lines: [{ drugId: drugByCode["MET-500"]!, quantity: 30, useInsurance: true }],
      paymentMethod: PaymentMethod.INSURANCE,
      extra: {
        insuranceSchemeId: schemeUap.id,
        insuranceMemberRef: "UAP-0001",
        insurancePolicyRef: "UAP-POL-0001",
      },
    },
    {
      daysAgo: 14,
      patientIdx: null,
      lines: [{ drugId: drugByCode["ORS-SACH"]!, quantity: 20, useInsurance: false }],
      paymentMethod: PaymentMethod.CASH,
    },
    {
      daysAgo: 12,
      patientIdx: 2,
      lines: [{ drugId: drugByCode["OMP-20"]!, quantity: 10, useInsurance: false }],
      paymentMethod: PaymentMethod.CASH,
    },
    {
      daysAgo: 9,
      patientIdx: null,
      lines: [{ drugId: drugByCode["SAL-INH"]!, quantity: 2, useInsurance: false }],
      paymentMethod: PaymentMethod.MPESA_STK,
      extra: {
        mpesaPhone: "254712345678",
        mpesaCheckoutRequestId: "ws_CO_seed_demo_0001",
        mpesaReceiptNumber: "SEEDMPESA0001",
      },
    },
    {
      daysAgo: 7,
      patientIdx: 1,
      lines: [{ drugId: drugByCode["PAR-500"]!, quantity: 20, useInsurance: false }],
      paymentMethod: PaymentMethod.MPESA_MANUAL,
      extra: {
        mpesaManualType: MpesaManualType.PAYBILL,
        mpesaManualRef: "PB-0001",
        mpesaBusinessNumber: "522522",
      },
      // One voided sale for analytics demos (void/restock, status breakdown, etc.)
      voidAfterDays: 1,
      voidReason: "Customer changed mind (seed demo)",
    },
    {
      daysAgo: 5,
      patientIdx: null,
      lines: [{ drugId: drugByCode["FLU-150"]!, quantity: 5, useInsurance: false }],
      paymentMethod: PaymentMethod.CASH,
    },
    {
      daysAgo: 3,
      patientIdx: 0,
      lines: [{ drugId: drugByCode["PAR-500"]!, quantity: 15, useInsurance: false }],
      paymentMethod: PaymentMethod.CASH,
    },
    {
      daysAgo: 1,
      patientIdx: 3,
      lines: [{ drugId: drugByCode["INS-GLAR"]!, quantity: 2, useInsurance: true }],
      paymentMethod: PaymentMethod.INSURANCE,
      extra: {
        insuranceSchemeId: schemeNhif.id,
        insuranceMemberRef: "NHIF-0002",
        insurancePolicyRef: "POL-0002",
      },
    },
  ];

  let saleNum = 1;
  for (const sp of salesPlan) {
    const createdAt = atHour(daysAgo(sp.daysAgo), sp.daysAgo % 2 === 0 ? 11 : 16);
    const patientId = sp.patientIdx !== null ? patients[sp.patientIdx]!.id : null;
    await prisma.$transaction(
      async (tx) => {
        const sale = await createSaleWithFefo({
          tx,
          orgId: org.id,
          saleNumber: saleNum,
          createdById: sp.daysAgo > 15 ? pharmTech.id : admin.id,
          createdAt,
          patientId,
          lines: sp.lines,
          paymentMethod: sp.paymentMethod,
          paymentExtra: sp.extra,
          etimsStatus: sp.etims,
        });

        if (sp.paymentMethod === PaymentMethod.MPESA_STK) {
          await tx.mpesaTransaction.create({
            data: {
              organizationId: org.id,
              checkoutRequestId: sp.extra?.mpesaCheckoutRequestId ?? null,
              merchantRequestId: `mr_${String(sale.saleNumber).padStart(4, "0")}`,
              amount: sale.total,
              phoneNumber: sp.extra?.mpesaPhone ?? "254700000000",
              status: "SUCCESS",
              resultCode: 0,
              resultDesc: "The service request is processed successfully.",
              mpesaReceiptNumber: sp.extra?.mpesaReceiptNumber ?? null,
              saleId: sale.id,
              initiatedById: cashier.id,
              createdAt,
              updatedAt: createdAt,
              rawCallback: { seed: true, saleNumber: sale.saleNumber },
            },
          });
        }

        if (typeof sp.voidAfterDays === "number" && sp.voidAfterDays >= 0) {
          await voidSaleAndRestock({
            tx,
            orgId: org.id,
            saleId: sale.id,
            voidedById: admin.id,
            voidedAt: atHour(daysAgo(sp.daysAgo - sp.voidAfterDays), 18),
            voidReason: sp.voidReason ?? "Void (seed demo)",
          });
        }
      },
      {
        // Seed transactions can touch many rows and do FEFO allocation reads/writes.
        // Prisma's interactive transaction defaults are often too short for this.
        maxWait: 60_000,
        timeout: 5 * 60_000,
      },
    );
    saleNum += 1;
  }

  // Small stock events to make stock-value series less “flat”.
  await prisma.$transaction(
    async (tx) => {
      const orsId = drugByCode["ORS-SACH"]!;
      const orsAlloc = await allocateFefo(tx, org.id, orsId, 1);
      const orsBatchId = orsAlloc[0]!.batchId;
      const adjAt = atHour(daysAgo(2), 15);
      await tx.drugBatch.update({
        where: { id: orsBatchId },
        data: { quantityOnHand: { increment: 5 } },
      });
      await tx.stockMovement.create({
        data: {
          organizationId: org.id,
          type: StockMovementType.ADJUSTMENT,
          drugId: orsId,
          batchId: orsBatchId,
          quantity: 5,
          reason: "Stock count correction (seed demo)",
          createdById: admin.id,
          createdAt: adjAt,
        },
      });

      const ibuId = drugByCode["IBU-200"]!;
      const ibuAlloc = await allocateFefo(tx, org.id, ibuId, 1);
      const ibuBatchId = ibuAlloc[0]!.batchId;
      const retAt = atHour(daysAgo(4), 12);
      await tx.drugBatch.update({
        where: { id: ibuBatchId },
        data: { quantityOnHand: { increment: 2 } },
      });
      await tx.stockMovement.create({
        data: {
          organizationId: org.id,
          type: StockMovementType.RETURN,
          drugId: ibuId,
          batchId: ibuBatchId,
          quantity: 2,
          reason: "Customer return (sealed) — seed demo",
          createdById: cashier.id,
          createdAt: retAt,
        },
      });
    },
    {
      maxWait: 60_000,
      timeout: 5 * 60_000,
    },
  );

  // ---------------------------------------------------------------------------
  // Lightweight finance modules seed: supplier payables, insurance invoices, expenses
  // ---------------------------------------------------------------------------

  // Supplier bills (payables): mix of unpaid / part-paid / paid / overdue.
  const bill1 = await prisma.supplierBill.create({
    data: {
      organizationId: org.id,
      supplierId: suppliers[0]!.id,
      billNumber: "KEMSA-INV-1001",
      title: "Essential medicines restock",
      billDate: daysAgo(20),
      dueAt: daysAgo(5), // overdue
      subtotal: new Prisma.Decimal(18500),
      taxAmount: new Prisma.Decimal(0),
      total: new Prisma.Decimal(18500),
      status: SupplierBillStatus.UNPAID,
    },
  });

  const bill2 = await prisma.supplierBill.create({
    data: {
      organizationId: org.id,
      supplierId: suppliers[1]!.id,
      billNumber: "MED-INV-2007",
      title: "Generics & OTC top-up",
      billDate: daysAgo(12),
      dueAt: days(8),
      subtotal: new Prisma.Decimal(9200),
      taxAmount: new Prisma.Decimal(0),
      total: new Prisma.Decimal(9200),
      status: SupplierBillStatus.PARTIALLY_PAID,
    },
  });

  const bill3 = await prisma.supplierBill.create({
    data: {
      organizationId: org.id,
      supplierId: suppliers[2]!.id,
      billNumber: "COLD-INV-0312",
      title: "Cold chain supplies",
      billDate: daysAgo(8),
      dueAt: days(10),
      subtotal: new Prisma.Decimal(14600),
      taxAmount: new Prisma.Decimal(0),
      total: new Prisma.Decimal(14600),
      status: SupplierBillStatus.PAID,
    },
  });

  // Payments + allocations
  const payBill2 = await prisma.supplierPayment.create({
    data: {
      organizationId: org.id,
      supplierId: bill2.supplierId,
      method: SupplierPaymentMethod.MPESA,
      amount: new Prisma.Decimal(4000),
      paidAt: daysAgo(6),
      reference: "MPESA-ALLOC-0001",
      notes: "Part payment (seed demo)",
      allocations: {
        create: [{ supplierBillId: bill2.id, amount: new Prisma.Decimal(4000) }],
      },
    },
  });
  void payBill2;

  const payBill3 = await prisma.supplierPayment.create({
    data: {
      organizationId: org.id,
      supplierId: bill3.supplierId,
      method: SupplierPaymentMethod.BANK,
      amount: new Prisma.Decimal(14600),
      paidAt: daysAgo(3),
      reference: "BANK-TRF-7731",
      notes: "Full payment (seed demo)",
      allocations: {
        create: [{ supplierBillId: bill3.id, amount: new Prisma.Decimal(14600) }],
      },
    },
  });
  void payBill3;

  // Keep statuses consistent with allocations.
  await prisma.supplierBill.update({
    where: { id: bill2.id },
    data: { status: SupplierBillStatus.PARTIALLY_PAID },
  });
  await prisma.supplierBill.update({
    where: { id: bill3.id },
    data: { status: SupplierBillStatus.PAID },
  });

  // Insurance invoices: group existing pending insurance payments into printable invoices.
  const pendingNhif = await prisma.payment.findMany({
    where: {
      method: PaymentMethod.INSURANCE,
      status: PaymentStatus.PENDING,
      insuranceSchemeId: schemeNhif.id,
      sale: { organizationId: org.id, status: SaleStatus.COMPLETED },
    },
    orderBy: [{ sale: { createdAt: "asc" } }, { createdAt: "asc" }],
    include: {
      sale: {
        select: {
          id: true,
          saleNumber: true,
          createdAt: true,
          patient: { select: { fullName: true } },
        },
      },
    },
  });

  if (pendingNhif.length > 0) {
    const subtotal = pendingNhif.reduce(
      (acc, p) => acc.add(new Prisma.Decimal(p.amount)),
      new Prisma.Decimal(0),
    );

    const invNhif = await prisma.insuranceInvoice.create({
      data: {
        organizationId: org.id,
        invoiceNumber: 1,
        insuranceSchemeId: schemeNhif.id,
        status: InsuranceInvoiceStatus.SUBMITTED,
        periodFrom: daysAgo(30),
        periodTo: new Date(),
        dueAt: days(14),
        notes: "Seed invoice grouping pending NHIF claims",
        subtotal,
        taxAmount: new Prisma.Decimal(0),
        total: subtotal,
        submittedAt: daysAgo(0),
        lines: {
          create: pendingNhif.map((p) => ({
            paymentId: p.id,
            saleId: p.saleId,
            saleNumber: p.sale.saleNumber,
            saleCreatedAt: p.sale.createdAt,
            patientNameSnapshot: p.sale.patient?.fullName ?? null,
            memberRefSnapshot: p.insuranceMemberRef ?? null,
            policyRefSnapshot: p.insurancePolicyRef ?? null,
            amount: new Prisma.Decimal(p.amount),
          })),
        },
        payments: {
          // partial receipt to demonstrate PARTIALLY_PAID behavior in UI
          create: [
            {
              amount: pendingNhif.length > 1 ? new Prisma.Decimal(500) : subtotal.div(2),
              receivedAt: daysAgo(1),
              reference: "NHIF-REMIT-0001",
              notes: "Partial remittance (seed demo)",
            },
          ],
        },
      },
    });

    // Update status to PARTIALLY_PAID if applicable
    const paidAgg = await prisma.insuranceInvoicePayment.aggregate({
      where: { insuranceInvoiceId: invNhif.id },
      _sum: { amount: true },
    });
    const paid = paidAgg._sum.amount ? Number(paidAgg._sum.amount) : 0;
    const total = Number(invNhif.total);
    await prisma.insuranceInvoice.update({
      where: { id: invNhif.id },
      data:
        paid >= total
          ? { status: InsuranceInvoiceStatus.PAID, paidAt: daysAgo(1) }
          : paid > 0
            ? { status: InsuranceInvoiceStatus.PARTIALLY_PAID }
            : { status: InsuranceInvoiceStatus.SUBMITTED },
    });
  }

  const pendingUap = await prisma.payment.findMany({
    where: {
      method: PaymentMethod.INSURANCE,
      status: PaymentStatus.PENDING,
      insuranceSchemeId: schemeUap.id,
      sale: { organizationId: org.id, status: SaleStatus.COMPLETED },
    },
    orderBy: [{ sale: { createdAt: "asc" } }, { createdAt: "asc" }],
    include: {
      sale: {
        select: {
          id: true,
          saleNumber: true,
          createdAt: true,
          patient: { select: { fullName: true } },
        },
      },
    },
  });

  if (pendingUap.length > 0) {
    const subtotal = pendingUap.reduce(
      (acc, p) => acc.add(new Prisma.Decimal(p.amount)),
      new Prisma.Decimal(0),
    );
    await prisma.insuranceInvoice.create({
      data: {
        organizationId: org.id,
        invoiceNumber: 2,
        insuranceSchemeId: schemeUap.id,
        status: InsuranceInvoiceStatus.DRAFT,
        periodFrom: daysAgo(30),
        periodTo: new Date(),
        dueAt: days(21),
        notes: "Draft invoice (seed demo)",
        subtotal,
        taxAmount: new Prisma.Decimal(0),
        total: subtotal,
        lines: {
          create: pendingUap.map((p) => ({
            paymentId: p.id,
            saleId: p.saleId,
            saleNumber: p.sale.saleNumber,
            saleCreatedAt: p.sale.createdAt,
            patientNameSnapshot: p.sale.patient?.fullName ?? null,
            memberRefSnapshot: p.insuranceMemberRef ?? null,
            policyRefSnapshot: p.insurancePolicyRef ?? null,
            amount: new Prisma.Decimal(p.amount),
          })),
        },
      },
    });
  }

  // Expenses for finance report (within recent month)
  await prisma.expense.createMany({
    data: [
      {
        organizationId: org.id,
        category: ExpenseCategory.RENT,
        description: "Shop rent (seed demo)",
        amount: new Prisma.Decimal(35000),
        spentAt: daysAgo(15),
        reference: "RENT-APR",
      },
      {
        organizationId: org.id,
        category: ExpenseCategory.UTILITIES,
        description: "Electricity tokens (seed demo)",
        amount: new Prisma.Decimal(4200),
        spentAt: daysAgo(10),
        reference: "KPLC-1021",
      },
      {
        organizationId: org.id,
        category: ExpenseCategory.TRANSPORT,
        description: "Supplier delivery fuel (seed demo)",
        amount: new Prisma.Decimal(1800),
        spentAt: daysAgo(6),
        reference: "FUEL-8891",
      },
      {
        organizationId: org.id,
        category: ExpenseCategory.MAINTENANCE,
        description: "Printer maintenance (seed demo)",
        amount: new Prisma.Decimal(950),
        spentAt: daysAgo(2),
        reference: "PRN-SVC-22",
      },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      {
        organizationId: org.id,
        userId: admin.id,
        action: "seed.complete",
        entityType: "Organization",
        entityId: org.id,
        metadata: {
          drugs: drugs.length,
          sales: saleNum - 1,
          patients: patients.length,
        },
      },
    ],
  });

  printSeedSummary({
    slug: org.slug,
    orgName: org.name,
    demoPassword: SEED_DEMO_PASSWORD,
    drugCount: drugs.length,
    patientCount: patients.length,
    salesCount: saleNum - 1,
  });
}

/** Strip ANSI escape sequences for width calculation. */
function stripAnsi(s: string) {
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

/** Pretty terminal output for `npm run db:seed` (no extra dependencies). */
function printSeedSummary(params: {
  slug: string;
  orgName: string;
  demoPassword: string;
  drugCount: number;
  patientCount: number;
  salesCount: number;
}) {
  const { slug, orgName, demoPassword, drugCount, patientCount, salesCount } =
    params;
  const color =
    process.stdout.isTTY && !process.env.NO_COLOR && !process.env.CI;
  const r = color ? "\x1b[0m" : "";
  const dim = color ? "\x1b[2m" : "";
  const bold = color ? "\x1b[1m" : "";
  const grn = color ? "\x1b[32m" : "";
  const cyn = color ? "\x1b[36m" : "";
  const yel = color ? "\x1b[33m" : "";

  const innerW = 54;
  const top = `${grn}╔${"═".repeat(innerW + 2)}╗${r}`;
  const mid = `${grn}╠${"═".repeat(innerW + 2)}╣${r}`;
  const bot = `${grn}╚${"═".repeat(innerW + 2)}╝${r}`;
  const row = (s: string) => {
    const pad = Math.max(0, innerW - stripAnsi(s).length);
    return `${grn}║${r} ${s}${" ".repeat(pad)} ${grn}║${r}`;
  };

  const lines: string[] = [
    "",
    top,
    row(`${bold}✓  Pharmacy seed${r}  ${dim}· ${slug}${r}`),
    row(`${orgName}`),
    mid,
    row(`${yel}Users${r}  ${dim}(same password for all)${r}`),
    row(`  ${dim}Password:${r}  ${bold}${demoPassword}${r}`),
    row(
      `  ${cyn}${"admin@pharmacy.local".padEnd(26)}${r}`,
    ),
    row(
      `  ${cyn}${"cashier@pharmacy.local".padEnd(26)}${r}`,
    ),
    row(
      `  ${cyn}${"pharmtech@pharmacy.local".padEnd(26)}${r}`,
    ),
    mid,
    row(`${yel}Inventory${r}`),
    row(`  ${drugCount} drugs · batches · stock movements`),
    mid,
    row(`${yel}Patients & engagement${r}`),
    row(`  ${patientCount} patients · 2 prescriptions · 1 promo campaign`),
    mid,
    row(`${yel}Sales${r}`),
    row(`  ${salesCount} invoices · cash · M-Pesa STK/manual · insurance`),
    row(`  ${dim}spread over ~28 days${r}`),
    mid,
    row(`${yel}Insurance schemes${r}`),
    row(`  NHIF · UAP · BRITAM (active)`),
    row(`  ${dim}LEGACY — inactive (POS demo)${r}`),
    mid,
    row(`${yel}Finance (seed demo)${r}`),
    row(`  supplier bills/payments · insurance invoices · expenses`),
    mid,
    row(`${yel}AI & integrations (demo)${r}`),
    row(`  2 AI chat logs · 1 M-Pesa txn (failed) · 1 offline queue (synced)`),
    bot,
    "",
    `${dim}Tip:${r} ${cyn}npm run db:studio${r} ${dim}· Prisma Studio${r}`,
    `${dim}Override password:${r} ${cyn}SEED_DEMO_PASSWORD${dim}=… ${r}${dim}npm run db:seed${r}`,
    "",
  ];

  console.log(lines.join("\n"));
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
