import { Prisma, UserRole } from "@prisma/client";
import { createCredentialUser } from "@/lib/auth-users";
import { prisma } from "@/lib/prisma";

export const DEMO_DURATION_HOURS = 4;

const hour = 60 * 60 * 1000;
const day = 24 * hour;

const medicines = [
  { code: "PCM-500", generic: "Paracetamol", brand: "Panadol", form: "Tablet", strength: "500", unit: "mg", cash: 10, insurance: 12, cost: 5, reorder: 35, quantity: 28, sold: 31, expiryDays: 220 },
  { code: "AMX-500", generic: "Amoxicillin", brand: "Amoxil", form: "Capsule", strength: "500", unit: "mg", cash: 25, insurance: 30, cost: 14, reorder: 25, quantity: 74, sold: 19, expiryDays: 310 },
  { code: "CTZ-010", generic: "Cetirizine", brand: "Cetzine", form: "Tablet", strength: "10", unit: "mg", cash: 15, insurance: 18, cost: 7, reorder: 20, quantity: 16, sold: 14, expiryDays: 64 },
  { code: "ORS-001", generic: "Oral rehydration salts", brand: "Hydral", form: "Sachet", strength: null, unit: null, cash: 40, insurance: 45, cost: 22, reorder: 18, quantity: 42, sold: 10, expiryDays: 145 },
  { code: "OMP-020", generic: "Omeprazole", brand: "Losec", form: "Capsule", strength: "20", unit: "mg", cash: 20, insurance: 24, cost: 11, reorder: 20, quantity: 61, sold: 7, expiryDays: 270 },
  { code: "DCL-050", generic: "Diclofenac", brand: "Voltaren", form: "Tablet", strength: "50", unit: "mg", cash: 18, insurance: 22, cost: 9, reorder: 15, quantity: 33, sold: 5, expiryDays: 82 },
  { code: "AZM-250", generic: "Azithromycin", brand: "Zithromax", form: "Tablet", strength: "250", unit: "mg", cash: 65, insurance: 75, cost: 42, reorder: 12, quantity: 29, sold: 3, expiryDays: 190 },
  { code: "HCT-025", generic: "Hydrochlorothiazide", brand: "HCTZ", form: "Tablet", strength: "25", unit: "mg", cash: 12, insurance: 15, cost: 6, reorder: 15, quantity: 38, sold: 2, expiryDays: 340 },
] as const;

export async function createDemoWorkspace() {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + DEMO_DURATION_HOURS * hour);
  const token = crypto.randomUUID().replaceAll("-", "");
  const email = `demo-${token.slice(0, 18)}@demo.pharmacyos.co.ke`;
  const password = `D3mo!${token}`;

  const organizationId = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name: "Greenview Community Pharmacy",
        slug: `demo-${token.slice(0, 20)}`,
        isDemo: true,
        demoExpiresAt: expiresAt,
        settings: {
          create: {
            businessName: "Greenview Community Pharmacy",
            businessTagline: "Care close to home",
            phoneNumber: "+254 712 345 678",
            email: "hello@greenview.example",
            city: "Nairobi",
            taxRatePercent: new Prisma.Decimal(16),
            receiptHeader: "Greenview Community Pharmacy",
            receiptFooter: "Thank you for trusting Greenview",
            defaultLowStockDays: 90,
            mpesaEnvironment: "sandbox",
          },
        },
        subscription: { create: { trialEndsAt: expiresAt } },
      },
    });

    const owner = await createCredentialUser(tx, {
      email,
      password,
      name: "Demo Pharmacy Owner",
      role: UserRole.ADMIN,
      organizationId: organization.id,
    });

    const supplier = await tx.supplier.create({
      data: {
        organizationId: organization.id,
        name: "MedSource Distributors",
        phone: "+254 700 555 010",
        email: "orders@medsource.example",
        address: "Enterprise Road, Nairobi",
        speciality: "General pharmaceuticals",
      },
    });

    const patients = await Promise.all([
      tx.patient.create({ data: { organizationId: organization.id, fullName: "Amina Wanjiku", phone: "+254 711 204 302", marketingConsent: true } }),
      tx.patient.create({ data: { organizationId: organization.id, fullName: "Brian Otieno", phone: "+254 722 810 415" } }),
      tx.patient.create({ data: { organizationId: organization.id, fullName: "Grace Njeri", phone: "+254 733 119 822", notes: "Prefers SMS refill reminders" } }),
    ]);

    const inventory = [];
    for (const [index, medicine] of medicines.entries()) {
      const drug = await tx.drug.create({
        data: {
          organizationId: organization.id,
          internalCode: medicine.code,
          genericName: medicine.generic,
          brandName: medicine.brand,
          dosageForm: medicine.form,
          strengthValue: medicine.strength,
          strengthUnit: medicine.unit,
          prescriptionClass: medicine.code === "AMX-500" || medicine.code === "AZM-250" ? "RX" : "OTC",
          manufacturer: index % 2 === 0 ? "Universal Pharma" : "East Africa Labs",
          patientDirections: "Use as directed by the pharmacist",
          priceCash: new Prisma.Decimal(medicine.cash),
          priceInsurance: new Prisma.Decimal(medicine.insurance),
          buyingPrice: new Prisma.Decimal(medicine.cost),
          costLast: new Prisma.Decimal(medicine.cost),
          reorderLevel: medicine.reorder,
          maxStock: medicine.reorder * 5,
        },
      });
      const batch = await tx.drugBatch.create({
        data: {
          organizationId: organization.id,
          drugId: drug.id,
          batchNumber: `GV-${String(index + 1).padStart(3, "0")}-26`,
          expiryDate: new Date(now.getTime() + medicine.expiryDays * day),
          quantityOnHand: medicine.quantity,
          supplierId: supplier.id,
          receivedAt: new Date(now.getTime() - 45 * day),
          purchaseRef: "PO-GV-1042",
          unitCost: new Prisma.Decimal(medicine.cost),
        },
      });
      await tx.stockMovement.create({
        data: {
          organizationId: organization.id,
          type: "RECEIPT",
          drugId: drug.id,
          batchId: batch.id,
          quantity: medicine.quantity + medicine.sold,
          reason: "Opening demo stock",
          createdById: owner.id,
          createdAt: new Date(now.getTime() - 45 * day),
        },
      });
      inventory.push({ medicine, drug, batch });
    }

    for (const [index, item] of inventory.entries()) {
      const quantity = item.medicine.sold;
      const createdAt = index === 0
        ? new Date(now.getTime() - 32 * 60 * 1000)
        : new Date(now.getTime() - (index * 3 + 2) * day);
      const total = item.medicine.cash * quantity;
      const sale = await tx.sale.create({
        data: {
          organizationId: organization.id,
          saleNumber: 1048 + index,
          patientId: patients[index % patients.length].id,
          subtotal: new Prisma.Decimal(total),
          taxAmount: new Prisma.Decimal(0),
          total: new Prisma.Decimal(total),
          createdById: owner.id,
          etimsStatus: index % 3 === 0 ? "ACKNOWLEDGED" : "NOT_APPLICABLE",
          kraInvoiceNumber: index % 3 === 0 ? `KRA-GV-${1048 + index}` : null,
          createdAt,
          lines: {
            create: {
              drugId: item.drug.id,
              quantity,
              unitPrice: new Prisma.Decimal(item.medicine.cash),
              lineTotal: new Prisma.Decimal(total),
              batchAllocations: { create: { batchId: item.batch.id, quantity } },
            },
          },
          payments: {
            create: {
              method: index % 3 === 0 ? "MPESA_MANUAL" : "CASH",
              amount: new Prisma.Decimal(total),
              status: "COMPLETED",
              mpesaManualType: index % 3 === 0 ? "TILL" : null,
              mpesaManualRef: index % 3 === 0 ? `DEMO${1048 + index}` : null,
              mpesaBusinessNumber: index % 3 === 0 ? "123456" : null,
              createdAt,
            },
          },
        },
      });
      await tx.stockMovement.create({
        data: {
          organizationId: organization.id,
          type: "SALE",
          drugId: item.drug.id,
          batchId: item.batch.id,
          quantity: -quantity,
          reason: `Sale ${sale.saleNumber}`,
          saleId: sale.id,
          createdById: owner.id,
          createdAt,
        },
      });
    }

    return organization.id;
  }, { timeout: 30_000 });

  return { organizationId, email, password, expiresAt };
}

export async function deleteDemoWorkspace(organizationId: string) {
  return prisma.$transaction(async (tx) => {
    const demo = await tx.organization.findFirst({
      where: { id: organizationId, isDemo: true },
      select: { id: true },
    });
    if (!demo) return false;

    // Remove restrictive sale links before the organization-level cascades run.
    await tx.sale.deleteMany({ where: { organizationId } });
    await tx.stockMovement.deleteMany({ where: { organizationId } });
    await tx.organization.delete({ where: { id: organizationId } });
    return true;
  });
}

export async function deleteExpiredDemoWorkspaces(now = new Date()) {
  const expired = await prisma.organization.findMany({
    where: { isDemo: true, demoExpiresAt: { lte: now } },
    select: { id: true },
    take: 100,
  });
  let count = 0;
  for (const { id } of expired) {
    if (await deleteDemoWorkspace(id)) count += 1;
  }
  return { count };
}
