-- AlterTable
ALTER TABLE "Order"
ADD COLUMN "paymentCollectedAt" TIMESTAMP(3),
ADD COLUMN "completedAt" TIMESTAMP(3);
