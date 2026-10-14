ALTER TABLE "RestaurantTable" ADD COLUMN "isOccupied" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "RestaurantTable" ADD COLUMN "activeOrderingSessionToken" TEXT;

CREATE INDEX "RestaurantTable_restaurantId_isOccupied_idx"
ON "RestaurantTable"("restaurantId", "isOccupied");
