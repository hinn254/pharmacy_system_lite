/*
  Warnings:

  - You are about to drop the column `clientId` on the `ConsultationCase` table. All the data in the column will be lost.
  - You are about to drop the column `clientSegment` on the `DiscountCode` table. All the data in the column will be lost.
  - You are about to drop the column `clientMutationId` on the `OfflineSyncQueue` table. All the data in the column will be lost.
  - You are about to drop the column `clientId` on the `Prescription` table. All the data in the column will be lost.
  - You are about to drop the column `clientId` on the `Sale` table. All the data in the column will be lost.
  - You are about to drop the `Client` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DiscountCodeClient` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[patientMutationId]` on the table `OfflineSyncQueue` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `patientId` to the `ConsultationCase` table without a default value. This is not possible if the table is not empty.
  - Added the required column `patientMutationId` to the `OfflineSyncQueue` table without a default value. This is not possible if the table is not empty.
  - Added the required column `patientId` to the `Prescription` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DiscountPatientSegment" AS ENUM ('ANY', 'NEW_PATIENT', 'RETURNING_PATIENT');

-- DropForeignKey
ALTER TABLE "Client" DROP CONSTRAINT "Client_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "ConsultationCase" DROP CONSTRAINT "ConsultationCase_clientId_fkey";

-- DropForeignKey
ALTER TABLE "DiscountCodeClient" DROP CONSTRAINT "DiscountCodeClient_clientId_fkey";

-- DropForeignKey
ALTER TABLE "DiscountCodeClient" DROP CONSTRAINT "DiscountCodeClient_discountCodeId_fkey";

-- DropForeignKey
ALTER TABLE "Prescription" DROP CONSTRAINT "Prescription_clientId_fkey";

-- DropForeignKey
ALTER TABLE "Sale" DROP CONSTRAINT "Sale_clientId_fkey";

-- DropIndex
DROP INDEX "ConsultationCase_organizationId_clientId_createdAt_idx";

-- DropIndex
DROP INDEX "OfflineSyncQueue_clientMutationId_key";

-- DropIndex
DROP INDEX "Prescription_clientId_idx";

-- AlterTable
ALTER TABLE "ConsultationCase" DROP COLUMN "clientId",
ADD COLUMN     "patientId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "DiscountCode" DROP COLUMN "clientSegment",
ADD COLUMN     "patientSegment" "DiscountPatientSegment" NOT NULL DEFAULT 'ANY';

-- AlterTable
ALTER TABLE "OfflineSyncQueue" DROP COLUMN "clientMutationId",
ADD COLUMN     "patientMutationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Prescription" DROP COLUMN "clientId",
ADD COLUMN     "patientId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Sale" DROP COLUMN "clientId",
ADD COLUMN     "patientId" TEXT;

-- DropTable
DROP TABLE "Client";

-- DropTable
DROP TABLE "DiscountCodeClient";

-- DropEnum
DROP TYPE "DiscountClientSegment";

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "dob" TIMESTAMP(3),
    "notes" TEXT,
    "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscountCodePatient" (
    "id" TEXT NOT NULL,
    "discountCodeId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,

    CONSTRAINT "DiscountCodePatient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Patient_organizationId_phone_idx" ON "Patient"("organizationId", "phone");

-- CreateIndex
CREATE INDEX "DiscountCodePatient_patientId_idx" ON "DiscountCodePatient"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "DiscountCodePatient_discountCodeId_patientId_key" ON "DiscountCodePatient"("discountCodeId", "patientId");

-- CreateIndex
CREATE INDEX "ConsultationCase_organizationId_patientId_createdAt_idx" ON "ConsultationCase"("organizationId", "patientId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OfflineSyncQueue_patientMutationId_key" ON "OfflineSyncQueue"("patientMutationId");

-- CreateIndex
CREATE INDEX "Prescription_patientId_idx" ON "Prescription"("patientId");

-- AddForeignKey
ALTER TABLE "ConsultationCase" ADD CONSTRAINT "ConsultationCase_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountCodePatient" ADD CONSTRAINT "DiscountCodePatient_discountCodeId_fkey" FOREIGN KEY ("discountCodeId") REFERENCES "DiscountCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountCodePatient" ADD CONSTRAINT "DiscountCodePatient_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
