-- Raison sociale facultative du client : sur la fiche client et dans l'instantané
-- de la commande. Colonnes nullables, ajout pur : le code déjà déployé sur la même
-- base les ignore. À appliquer avant de déployer le code qui les lit.

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "company" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "clientCompany" TEXT;
