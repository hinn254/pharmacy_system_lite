-- AlterTable: support multiple DDA category ids per org
ALTER TABLE "OrganizationSettings" ADD COLUMN "controlledDrugCategoryIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

UPDATE "OrganizationSettings"
SET "controlledDrugCategoryIds" = ARRAY["controlledDrugCategoryId"]::TEXT[]
WHERE "controlledDrugCategoryId" IS NOT NULL;

ALTER TABLE "OrganizationSettings" DROP COLUMN "controlledDrugCategoryId";
