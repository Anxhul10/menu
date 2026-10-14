-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN "description" TEXT,
ADD COLUMN "address" TEXT,
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "Restaurant_ownerId_isActive_idx" ON "Restaurant"("ownerId", "isActive");
