-- Migration: Ajout du modele DiscountCode et champs promoCode sur Order

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "promoCode" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "promoDiscountCents" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE IF NOT EXISTS "DiscountCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "type" "DiscountType" NOT NULL DEFAULT 'PERCENTAGE',
    "percentage" INTEGER,
    "amountCents" INTEGER,
    "minSubtotalCents" INTEGER,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscountCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "DiscountCode_code_key" ON "DiscountCode"("code");
CREATE INDEX IF NOT EXISTS "DiscountCode_code_idx" ON "DiscountCode"("code");
CREATE INDEX IF NOT EXISTS "DiscountCode_active_idx" ON "DiscountCode"("active");
