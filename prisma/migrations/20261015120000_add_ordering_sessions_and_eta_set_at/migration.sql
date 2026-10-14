ALTER TABLE "Order" ADD COLUMN "orderingSessionToken" TEXT;
ALTER TABLE "Order" ADD COLUMN "etaSetAt" TIMESTAMP(3);

CREATE INDEX "Order_restaurantTableId_orderingSessionToken_createdAt_idx"
ON "Order"("restaurantTableId", "orderingSessionToken", "createdAt");
