-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "insuranceSchemeId" TEXT;

-- CreateTable
CREATE TABLE "InsuranceScheme" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsuranceScheme_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InsuranceScheme_organizationId_isActive_idx" ON "InsuranceScheme"("organizationId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "InsuranceScheme_organizationId_code_key" ON "InsuranceScheme"("organizationId", "code");

-- CreateIndex
CREATE INDEX "Payment_insuranceSchemeId_idx" ON "Payment"("insuranceSchemeId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_insuranceSchemeId_fkey" FOREIGN KEY ("insuranceSchemeId") REFERENCES "InsuranceScheme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceScheme" ADD CONSTRAINT "InsuranceScheme_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
