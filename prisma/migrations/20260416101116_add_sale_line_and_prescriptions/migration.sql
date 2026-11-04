-- AlterTable
ALTER TABLE "Drug" ADD COLUMN     "buyingPrice" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "DrugBatch" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedById" TEXT,
ADD COLUMN     "deletedReason" TEXT;

-- AlterTable
ALTER TABLE "SaleLine" ADD COLUMN     "directionsOverride" TEXT;

-- CreateIndex
CREATE INDEX "DrugBatch_organizationId_deletedAt_idx" ON "DrugBatch"("organizationId", "deletedAt");

-- AddForeignKey
ALTER TABLE "DrugBatch" ADD CONSTRAINT "DrugBatch_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
