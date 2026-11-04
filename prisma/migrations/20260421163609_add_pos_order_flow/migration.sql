-- CreateEnum
CREATE TYPE "PosOrderStatus" AS ENUM ('QUEUED', 'IN_PROGRESS', 'FINALIZED', 'READY_TO_DISPENSE', 'DISPENSED', 'CANCELLED');

-- CreateTable
CREATE TABLE "PosOrder" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "orderNumber" INTEGER,
    "status" "PosOrderStatus" NOT NULL DEFAULT 'QUEUED',
    "patientId" TEXT,
    "prescriptionPhotoUrl" TEXT,
    "selectedPaymentMethod" "PaymentMethod" NOT NULL,
    "discountCodesSnapshot" JSONB,
    "selectedInsuranceSchemeId" TEXT,
    "subtotalSnapshot" DECIMAL(12,2) NOT NULL,
    "discountAmountSnapshot" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxAmountSnapshot" DECIMAL(12,2) NOT NULL,
    "totalSnapshot" DECIMAL(12,2) NOT NULL,
    "taxableAmountSnapshot" DECIMAL(12,2),
    "taxRateSnapshot" DECIMAL(6,2),
    "vatEnabledSnapshot" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "pickedById" TEXT,
    "pickedUpAt" TIMESTAMP(3),
    "finalizedAt" TIMESTAMP(3),
    "sentToDispenseAt" TIMESTAMP(3),
    "dispensedAt" TIMESTAMP(3),
    "saleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosOrderLine" (
    "id" TEXT NOT NULL,
    "posOrderId" TEXT NOT NULL,
    "drugId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "useInsurancePrice" BOOLEAN NOT NULL DEFAULT false,
    "directionsOverride" TEXT,
    "unitPriceSnapshot" DECIMAL(12,2) NOT NULL,
    "lineTotalSnapshot" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "PosOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PosOrder_saleId_key" ON "PosOrder"("saleId");

-- CreateIndex
CREATE INDEX "PosOrder_organizationId_status_createdAt_idx" ON "PosOrder"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PosOrder_organizationId_patientId_createdAt_idx" ON "PosOrder"("organizationId", "patientId", "createdAt");

-- CreateIndex
CREATE INDEX "PosOrder_organizationId_saleId_idx" ON "PosOrder"("organizationId", "saleId");

-- CreateIndex
CREATE INDEX "PosOrder_organizationId_createdById_createdAt_idx" ON "PosOrder"("organizationId", "createdById", "createdAt");

-- CreateIndex
CREATE INDEX "PosOrderLine_posOrderId_idx" ON "PosOrderLine"("posOrderId");

-- CreateIndex
CREATE INDEX "PosOrderLine_drugId_idx" ON "PosOrderLine"("drugId");

-- AddForeignKey
ALTER TABLE "PosOrder" ADD CONSTRAINT "PosOrder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosOrder" ADD CONSTRAINT "PosOrder_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosOrder" ADD CONSTRAINT "PosOrder_selectedInsuranceSchemeId_fkey" FOREIGN KEY ("selectedInsuranceSchemeId") REFERENCES "InsuranceScheme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosOrder" ADD CONSTRAINT "PosOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosOrder" ADD CONSTRAINT "PosOrder_pickedById_fkey" FOREIGN KEY ("pickedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosOrder" ADD CONSTRAINT "PosOrder_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosOrderLine" ADD CONSTRAINT "PosOrderLine_posOrderId_fkey" FOREIGN KEY ("posOrderId") REFERENCES "PosOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosOrderLine" ADD CONSTRAINT "PosOrderLine_drugId_fkey" FOREIGN KEY ("drugId") REFERENCES "Drug"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
