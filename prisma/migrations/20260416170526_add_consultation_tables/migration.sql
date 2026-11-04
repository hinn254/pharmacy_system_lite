-- CreateEnum
CREATE TYPE "ConsultationCaseStatus" AS ENUM ('OPEN', 'ASSIGNED', 'IN_CONSULT', 'READY_FOR_PHARMTECH', 'READY_FOR_CASHIER', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ConsultationMedicationOrderStatus" AS ENUM ('DRAFT', 'SENT_TO_PHARMTECH', 'SENT_TO_CASHIER', 'DISPENSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ConsultationPricingMode" AS ENUM ('CASH', 'INSURANCE');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'DOCTOR';

-- CreateTable
CREATE TABLE "DoctorProfile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "speciality" TEXT,
    "consultFeeCash" DECIMAL(12,2) NOT NULL,
    "consultFeeInsurance" DECIMAL(12,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultationCase" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "assignedDoctorId" TEXT,
    "status" "ConsultationCaseStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultationCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultationEncounter" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "temperatureC" DECIMAL(6,2),
    "weightKg" DECIMAL(6,2),
    "heightCm" DECIMAL(6,2),
    "bpSystolic" INTEGER,
    "bpDiastolic" INTEGER,
    "pulseBpm" INTEGER,
    "spo2Percent" INTEGER,
    "respRate" INTEGER,
    "chiefComplaint" TEXT,
    "assessment" TEXT,
    "plan" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultationEncounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultationMedicationOrder" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "drugId" TEXT,
    "externalDrugName" TEXT,
    "fulfillOutside" BOOLEAN NOT NULL DEFAULT false,
    "quantity" INTEGER NOT NULL,
    "instructions" TEXT,
    "status" "ConsultationMedicationOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultationMedicationOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultationCheckout" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "buyInPharmacy" BOOLEAN NOT NULL DEFAULT true,
    "pricingMode" "ConsultationPricingMode" NOT NULL,
    "consultationFee" DECIMAL(12,2) NOT NULL,
    "medsSubtotal" DECIMAL(12,2) NOT NULL,
    "taxAmount" DECIMAL(12,2) NOT NULL,
    "totalDue" DECIMAL(12,2) NOT NULL,
    "cashierSaleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultationCheckout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleServiceLine" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "lineTotal" DECIMAL(12,2) NOT NULL,
    "usedInsurancePrice" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SaleServiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DoctorProfile_userId_key" ON "DoctorProfile"("userId");

-- CreateIndex
CREATE INDEX "DoctorProfile_organizationId_isActive_idx" ON "DoctorProfile"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "ConsultationCase_organizationId_status_createdAt_idx" ON "ConsultationCase"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ConsultationCase_organizationId_clientId_createdAt_idx" ON "ConsultationCase"("organizationId", "clientId", "createdAt");

-- CreateIndex
CREATE INDEX "ConsultationCase_organizationId_assignedDoctorId_status_idx" ON "ConsultationCase"("organizationId", "assignedDoctorId", "status");

-- CreateIndex
CREATE INDEX "ConsultationEncounter_organizationId_caseId_createdAt_idx" ON "ConsultationEncounter"("organizationId", "caseId", "createdAt");

-- CreateIndex
CREATE INDEX "ConsultationEncounter_createdById_createdAt_idx" ON "ConsultationEncounter"("createdById", "createdAt");

-- CreateIndex
CREATE INDEX "ConsultationMedicationOrder_organizationId_caseId_status_idx" ON "ConsultationMedicationOrder"("organizationId", "caseId", "status");

-- CreateIndex
CREATE INDEX "ConsultationMedicationOrder_organizationId_drugId_idx" ON "ConsultationMedicationOrder"("organizationId", "drugId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsultationCheckout_caseId_key" ON "ConsultationCheckout"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsultationCheckout_cashierSaleId_key" ON "ConsultationCheckout"("cashierSaleId");

-- CreateIndex
CREATE INDEX "ConsultationCheckout_organizationId_createdAt_idx" ON "ConsultationCheckout"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "ConsultationCheckout_cashierSaleId_idx" ON "ConsultationCheckout"("cashierSaleId");

-- CreateIndex
CREATE INDEX "SaleServiceLine_saleId_idx" ON "SaleServiceLine"("saleId");

-- AddForeignKey
ALTER TABLE "DoctorProfile" ADD CONSTRAINT "DoctorProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorProfile" ADD CONSTRAINT "DoctorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationCase" ADD CONSTRAINT "ConsultationCase_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationCase" ADD CONSTRAINT "ConsultationCase_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationCase" ADD CONSTRAINT "ConsultationCase_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationCase" ADD CONSTRAINT "ConsultationCase_assignedDoctorId_fkey" FOREIGN KEY ("assignedDoctorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationEncounter" ADD CONSTRAINT "ConsultationEncounter_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationEncounter" ADD CONSTRAINT "ConsultationEncounter_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ConsultationCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationEncounter" ADD CONSTRAINT "ConsultationEncounter_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationMedicationOrder" ADD CONSTRAINT "ConsultationMedicationOrder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationMedicationOrder" ADD CONSTRAINT "ConsultationMedicationOrder_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ConsultationCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationMedicationOrder" ADD CONSTRAINT "ConsultationMedicationOrder_drugId_fkey" FOREIGN KEY ("drugId") REFERENCES "Drug"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationCheckout" ADD CONSTRAINT "ConsultationCheckout_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationCheckout" ADD CONSTRAINT "ConsultationCheckout_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ConsultationCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationCheckout" ADD CONSTRAINT "ConsultationCheckout_cashierSaleId_fkey" FOREIGN KEY ("cashierSaleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleServiceLine" ADD CONSTRAINT "SaleServiceLine_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
