-- AlterTable
ALTER TABLE "Webhook" ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Webhook_sortOrder_createdAt_idx" ON "Webhook"("sortOrder", "createdAt");
