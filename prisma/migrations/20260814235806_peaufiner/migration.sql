-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "assignedToId" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "alcoholVolume" DOUBLE PRECISION,
ADD COLUMN     "isBio" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isVegan" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastLoginAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
