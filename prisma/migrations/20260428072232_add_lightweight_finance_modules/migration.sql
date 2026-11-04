-- CreateEnum
CREATE TYPE "InsuranceInvoiceStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'PARTIALLY_PAID', 'PAID', 'VOIDED');

-- CreateEnum
CREATE TYPE "SupplierBillStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'VOIDED');

-- CreateEnum
CREATE TYPE "SupplierPaymentMethod" AS ENUM ('CASH', 'MPESA', 'BANK', 'OTHER');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('RENT', 'SALARIES', 'UTILITIES', 'TRANSPORT', 'SUPPLIES', 'MAINTENANCE', 'MARKETING', 'TAXES', 'OTHER');

-- CreateTable
CREATE TABLE "InsuranceInvoice" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "invoiceNumber" INTEGER NOT NULL,
    "status" "InsuranceInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "insuranceSchemeId" TEXT NOT NULL,
    "periodFrom" TIMESTAMP(3),
    "periodTo" TIMESTAMP(3),
    "notes" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "dueAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsuranceInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsuranceInvoiceLine" (
    "id" TEXT NOT NULL,
    "insuranceInvoiceId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "saleNumber" INTEGER NOT NULL,
    "saleCreatedAt" TIMESTAMP(3) NOT NULL,
    "patientNameSnapshot" TEXT,
    "memberRefSnapshot" TEXT,
    "policyRefSnapshot" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "InsuranceInvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsuranceInvoicePayment" (
    "id" TEXT NOT NULL,
    "insuranceInvoiceId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InsuranceInvoicePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierBill" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "billNumber" TEXT,
    "title" TEXT,
    "notes" TEXT,
    "billDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3),
    "subtotal" DECIMAL(12,2) NOT NULL,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "status" "SupplierBillStatus" NOT NULL DEFAULT 'UNPAID',
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierPayment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "method" "SupplierPaymentMethod" NOT NULL DEFAULT 'OTHER',
    "amount" DECIMAL(12,2) NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierPaymentAllocation" (
    "id" TEXT NOT NULL,
    "supplierPaymentId" TEXT NOT NULL,
    "supplierBillId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "SupplierPaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL DEFAULT 'OTHER',
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "spentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InsuranceInvoice_organizationId_insuranceSchemeId_createdAt_idx" ON "InsuranceInvoice"("organizationId", "insuranceSchemeId", "createdAt");

-- CreateIndex
CREATE INDEX "InsuranceInvoice_organizationId_status_createdAt_idx" ON "InsuranceInvoice"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "InsuranceInvoice_organizationId_invoiceNumber_key" ON "InsuranceInvoice"("organizationId", "invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "InsuranceInvoiceLine_paymentId_key" ON "InsuranceInvoiceLine"("paymentId");

-- CreateIndex
CREATE INDEX "InsuranceInvoiceLine_insuranceInvoiceId_idx" ON "InsuranceInvoiceLine"("insuranceInvoiceId");

-- CreateIndex
CREATE INDEX "InsuranceInvoiceLine_saleId_idx" ON "InsuranceInvoiceLine"("saleId");

-- CreateIndex
CREATE INDEX "InsuranceInvoicePayment_insuranceInvoiceId_receivedAt_idx" ON "InsuranceInvoicePayment"("insuranceInvoiceId", "receivedAt");

-- CreateIndex
CREATE INDEX "SupplierBill_organizationId_supplierId_billDate_idx" ON "SupplierBill"("organizationId", "supplierId", "billDate");

-- CreateIndex
CREATE INDEX "SupplierBill_organizationId_status_dueAt_idx" ON "SupplierBill"("organizationId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "SupplierPayment_organizationId_supplierId_paidAt_idx" ON "SupplierPayment"("organizationId", "supplierId", "paidAt");

-- CreateIndex
CREATE INDEX "SupplierPaymentAllocation_supplierBillId_idx" ON "SupplierPaymentAllocation"("supplierBillId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierPaymentAllocation_supplierPaymentId_supplierBillId_key" ON "SupplierPaymentAllocation"("supplierPaymentId", "supplierBillId");

-- CreateIndex
CREATE INDEX "Expense_organizationId_category_spentAt_idx" ON "Expense"("organizationId", "category", "spentAt");

-- AddForeignKey
ALTER TABLE "InsuranceInvoice" ADD CONSTRAINT "InsuranceInvoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceInvoice" ADD CONSTRAINT "InsuranceInvoice_insuranceSchemeId_fkey" FOREIGN KEY ("insuranceSchemeId") REFERENCES "InsuranceScheme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceInvoiceLine" ADD CONSTRAINT "InsuranceInvoiceLine_insuranceInvoiceId_fkey" FOREIGN KEY ("insuranceInvoiceId") REFERENCES "InsuranceInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceInvoiceLine" ADD CONSTRAINT "InsuranceInvoiceLine_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceInvoiceLine" ADD CONSTRAINT "InsuranceInvoiceLine_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceInvoicePayment" ADD CONSTRAINT "InsuranceInvoicePayment_insuranceInvoiceId_fkey" FOREIGN KEY ("insuranceInvoiceId") REFERENCES "InsuranceInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierBill" ADD CONSTRAINT "SupplierBill_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierBill" ADD CONSTRAINT "SupplierBill_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPaymentAllocation" ADD CONSTRAINT "SupplierPaymentAllocation_supplierPaymentId_fkey" FOREIGN KEY ("supplierPaymentId") REFERENCES "SupplierPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPaymentAllocation" ADD CONSTRAINT "SupplierPaymentAllocation_supplierBillId_fkey" FOREIGN KEY ("supplierBillId") REFERENCES "SupplierBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
