-- CreateTable
CREATE TABLE "AiChatLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pageContext" TEXT NOT NULL,
    "userMessage" TEXT NOT NULL,
    "assistantMessage" TEXT,
    "model" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiChatLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiChatLog_organizationId_createdAt_idx" ON "AiChatLog"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "AiChatLog_userId_idx" ON "AiChatLog"("userId");

-- AddForeignKey
ALTER TABLE "AiChatLog" ADD CONSTRAINT "AiChatLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiChatLog" ADD CONSTRAINT "AiChatLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
