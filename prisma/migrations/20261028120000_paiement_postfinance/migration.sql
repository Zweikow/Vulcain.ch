-- Paiement en ligne PostFinance Checkout : mode de paiement et jeton public sur
-- la commande, statut EN_ATTENTE_PAIEMENT, tentatives de paiement et trace des
-- webhooks. Les commandes existantes restent en mode FACTURE.
-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('FACTURE', 'EN_LIGNE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'PAIEMENT_CONFIRME';
ALTER TYPE "AuditAction" ADD VALUE 'PAIEMENT_ECHOUE';
ALTER TYPE "AuditAction" ADD VALUE 'PAIEMENT_ANOMALIE';

-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'EN_ATTENTE_PAIEMENT';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paymentMode" "PaymentMode" NOT NULL DEFAULT 'FACTURE',
ADD COLUMN     "paymentToken" TEXT;

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "transactionId" BIGINT NOT NULL,
    "spaceId" BIGINT NOT NULL,
    "state" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "paymentMethod" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "authorizedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "fulfilledAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentWebhookEvent" (
    "eventId" BIGINT NOT NULL,
    "entityId" BIGINT NOT NULL,
    "entityName" TEXT NOT NULL,
    "state" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "outcome" TEXT,

    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("eventId")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTransaction_transactionId_key" ON "PaymentTransaction"("transactionId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_orderId_idx" ON "PaymentTransaction"("orderId");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_entityId_idx" ON "PaymentWebhookEvent"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_paymentToken_key" ON "Order"("paymentToken");

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

