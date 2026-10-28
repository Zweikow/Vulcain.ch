-- Lot B : choix et verrouillage du mode de paiement, facture PowerPay avec
-- supplément, transaction active par commande et statut « à vérifier ».

-- CreateEnum
CREATE TYPE "PaymentChoice" AS ENUM ('CARTE', 'POSTFINANCE_CARD', 'POSTFINANCE_PAY', 'TWINT', 'FACTURE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'PAIEMENT_A_VERIFIER';
ALTER TYPE "AuditAction" ADD VALUE 'MODE_PAIEMENT_CHANGE';
ALTER TYPE "AuditAction" ADD VALUE 'FACTURE_ACCEPTEE';
ALTER TYPE "AuditAction" ADD VALUE 'FACTURE_ENCAISSEE';

-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'A_VERIFIER';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "invoiceAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "invoiceFeeCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "invoiceUnavailable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentChoice" "PaymentChoice";

-- AlterTable
ALTER TABLE "PaymentTransaction" ADD COLUMN     "paymentChoice" "PaymentChoice",
ADD COLUMN     "paymentMethodConfigurationId" BIGINT,
ADD COLUMN     "supersededAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Setting" ADD COLUMN     "invoiceFeeCents" INTEGER NOT NULL DEFAULT 500;

