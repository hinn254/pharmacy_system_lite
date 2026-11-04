-- CreateTable
CREATE TABLE "DrugCategory" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DrugCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrugCategoryOnDrug" (
    "id" TEXT NOT NULL,
    "drugId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "DrugCategoryOnDrug_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DrugCategory_organizationId_name_idx" ON "DrugCategory"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "DrugCategory_organizationId_slug_key" ON "DrugCategory"("organizationId", "slug");

-- CreateIndex
CREATE INDEX "DrugCategoryOnDrug_drugId_idx" ON "DrugCategoryOnDrug"("drugId");

-- CreateIndex
CREATE INDEX "DrugCategoryOnDrug_categoryId_idx" ON "DrugCategoryOnDrug"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "DrugCategoryOnDrug_drugId_categoryId_key" ON "DrugCategoryOnDrug"("drugId", "categoryId");

-- AddForeignKey
ALTER TABLE "DrugCategory" ADD CONSTRAINT "DrugCategory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrugCategoryOnDrug" ADD CONSTRAINT "DrugCategoryOnDrug_drugId_fkey" FOREIGN KEY ("drugId") REFERENCES "Drug"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrugCategoryOnDrug" ADD CONSTRAINT "DrugCategoryOnDrug_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "DrugCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
