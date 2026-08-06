-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "paymentRef" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_paymentRef_key" ON "Subscription"("paymentRef");
