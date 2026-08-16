/*
  Warnings:

  - You are about to drop the column `orderId` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `orderNumero` on the `AuditLog` table. All the data in the column will be lost.
  - Added the required column `targetLabel` to the `AuditLog` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AuditTargetType" AS ENUM ('COMMANDE', 'PRODUIT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'PRIX_MODIFIE';
ALTER TYPE "AuditAction" ADD VALUE 'STOCK_AJUSTE';
ALTER TYPE "AuditAction" ADD VALUE 'PRODUIT_CREE';
ALTER TYPE "AuditAction" ADD VALUE 'PRODUIT_ARCHIVE';

-- AlterTable
ALTER TABLE "AuditLog" RENAME COLUMN "orderId" TO "targetId";
ALTER TABLE "AuditLog" RENAME COLUMN "orderNumero" TO "targetLabel";
ALTER TABLE "AuditLog" ADD COLUMN "targetType" "AuditTargetType" NOT NULL DEFAULT 'COMMANDE';
