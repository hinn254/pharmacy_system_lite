-- CreateEnum
CREATE TYPE "DiscountValueType" AS ENUM ('PERCENT', 'FIXED');

-- CreateEnum
CREATE TYPE "DiscountScopeType" AS ENUM ('ALL_DRUGS', 'DRUGS');

-- CreateEnum
CREATE TYPE "DiscountClientSegment" AS ENUM ('ANY', 'NEW_CLIENT', 'RETURNING_CLIENT');

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "totalBeforeDiscount" DECIMAL(12,2);

-- CreateTable
CREATE TABLE "DiscountCode" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "stackable" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "valueType" "DiscountValueType" NOT NULL,
    "valuePercent" DECIMAL(6,2),
    "valueAmount" DECIMAL(12,2),
    "scopeType" "DiscountScopeType" NOT NULL DEFAULT 'ALL_DRUGS',
    "clientSegment" "DiscountClientSegment" NOT NULL DEFAULT 'ANY',
    "sessionTag" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscountCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscountCodeDrug" (
    "id" TEXT NOT NULL,
    "discountCodeId" TEXT NOT NULL,
    "drugId" TEXT NOT NULL,

    CONSTRAINT "DiscountCodeDrug_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscountCodeClient" (
    "id" TEXT NOT NULL,
    "discountCodeId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,

    CONSTRAINT "DiscountCodeClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleDiscount" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "discountCodeId" TEXT,
    "codeSnapshot" TEXT NOT NULL,
    "nameSnapshot" TEXT NOT NULL,
    "valueTypeSnapshot" "DiscountValueType" NOT NULL,
    "valuePercentSnapshot" DECIMAL(6,2),
    "valueAmountSnapshot" DECIMAL(12,2),
    "appliedAmount" DECIMAL(12,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DiscountCode_organizationId_active_idx" ON "DiscountCode"("organizationId", "active");

-- CreateIndex
CREATE INDEX "DiscountCode_organizationId_sessionTag_idx" ON "DiscountCode"("organizationId", "sessionTag");

-- CreateIndex
CREATE UNIQUE INDEX "DiscountCode_organizationId_code_key" ON "DiscountCode"("organizationId", "code");

-- CreateIndex
CREATE INDEX "DiscountCodeDrug_drugId_idx" ON "DiscountCodeDrug"("drugId");

-- CreateIndex
CREATE UNIQUE INDEX "DiscountCodeDrug_discountCodeId_drugId_key" ON "DiscountCodeDrug"("discountCodeId", "drugId");

-- CreateIndex
CREATE INDEX "DiscountCodeClient_clientId_idx" ON "DiscountCodeClient"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "DiscountCodeClient_discountCodeId_clientId_key" ON "DiscountCodeClient"("discountCodeId", "clientId");

-- CreateIndex
CREATE INDEX "SaleDiscount_organizationId_createdAt_idx" ON "SaleDiscount"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "SaleDiscount_saleId_idx" ON "SaleDiscount"("saleId");

-- CreateIndex
CREATE INDEX "SaleDiscount_discountCodeId_idx" ON "SaleDiscount"("discountCodeId");

-- AddForeignKey
ALTER TABLE "DiscountCode" ADD CONSTRAINT "DiscountCode_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountCodeDrug" ADD CONSTRAINT "DiscountCodeDrug_discountCodeId_fkey" FOREIGN KEY ("discountCodeId") REFERENCES "DiscountCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountCodeDrug" ADD CONSTRAINT "DiscountCodeDrug_drugId_fkey" FOREIGN KEY ("drugId") REFERENCES "Drug"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountCodeClient" ADD CONSTRAINT "DiscountCodeClient_discountCodeId_fkey" FOREIGN KEY ("discountCodeId") REFERENCES "DiscountCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountCodeClient" ADD CONSTRAINT "DiscountCodeClient_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleDiscount" ADD CONSTRAINT "SaleDiscount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleDiscount" ADD CONSTRAINT "SaleDiscount_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleDiscount" ADD CONSTRAINT "SaleDiscount_discountCodeId_fkey" FOREIGN KEY ("discountCodeId") REFERENCES "DiscountCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
