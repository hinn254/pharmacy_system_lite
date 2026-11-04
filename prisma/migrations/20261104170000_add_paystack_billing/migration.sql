CREATE TYPE "SubscriptionInterval" AS ENUM ('MONTHLY', 'ANNUAL');
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'GRACE', 'PAST_DUE', 'EXPIRED', 'CANCELLED');
CREATE TYPE "BillingPaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'ABANDONED', 'REFUNDED');

CREATE TABLE "OrganizationSubscription" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
  "interval" "SubscriptionInterval",
  "amountMinor" INTEGER,
  "currency" TEXT NOT NULL DEFAULT 'KES',
  "trialStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "trialEndsAt" TIMESTAMP(3) NOT NULL,
  "periodStartAt" TIMESTAMP(3),
  "periodEndAt" TIMESTAMP(3),
  "graceEndsAt" TIMESTAMP(3),
  "cancelAtEnd" BOOLEAN NOT NULL DEFAULT false,
  "cancelledAt" TIMESTAMP(3),
  "customerCode" TEXT,
  "subscriptionCode" TEXT,
  "emailToken" TEXT,
  "planCode" TEXT,
  "lastPaymentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillingPlan" (
  "id" TEXT NOT NULL,
  "interval" "SubscriptionInterval" NOT NULL,
  "amountMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'KES',
  "paystackCode" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BillingPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillingPayment" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "subscriptionId" TEXT,
  "reference" TEXT NOT NULL,
  "interval" "SubscriptionInterval" NOT NULL,
  "status" "BillingPaymentStatus" NOT NULL DEFAULT 'PENDING',
  "amountMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'KES',
  "channel" TEXT,
  "transactionId" TEXT,
  "paidAt" TIMESTAMP(3),
  "failureReason" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BillingPayment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaystackWebhookEvent" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "dedupeKey" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "processedAt" TIMESTAMP(3),
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaystackWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrganizationSubscription_organizationId_key" ON "OrganizationSubscription"("organizationId");
CREATE UNIQUE INDEX "OrganizationSubscription_subscriptionCode_key" ON "OrganizationSubscription"("subscriptionCode");
CREATE INDEX "OrganizationSubscription_status_trialEndsAt_idx" ON "OrganizationSubscription"("status", "trialEndsAt");
CREATE INDEX "OrganizationSubscription_customerCode_idx" ON "OrganizationSubscription"("customerCode");
CREATE UNIQUE INDEX "BillingPlan_interval_key" ON "BillingPlan"("interval");
CREATE UNIQUE INDEX "BillingPlan_paystackCode_key" ON "BillingPlan"("paystackCode");
CREATE UNIQUE INDEX "BillingPayment_reference_key" ON "BillingPayment"("reference");
CREATE INDEX "BillingPayment_organizationId_createdAt_idx" ON "BillingPayment"("organizationId", "createdAt");
CREATE INDEX "BillingPayment_subscriptionId_status_idx" ON "BillingPayment"("subscriptionId", "status");
CREATE UNIQUE INDEX "PaystackWebhookEvent_dedupeKey_key" ON "PaystackWebhookEvent"("dedupeKey");
CREATE INDEX "PaystackWebhookEvent_eventType_createdAt_idx" ON "PaystackWebhookEvent"("eventType", "createdAt");

ALTER TABLE "OrganizationSubscription" ADD CONSTRAINT "OrganizationSubscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillingPayment" ADD CONSTRAINT "BillingPayment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillingPayment" ADD CONSTRAINT "BillingPayment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "OrganizationSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaystackWebhookEvent" ADD CONSTRAINT "PaystackWebhookEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

