-- Annulation de commande. Une commande annulée n'est jamais supprimée : elle
-- reste tracée (son numéro a déjà été communiqué au client par email) et sort
-- simplement des écrans de travail et des statistiques.

ALTER TYPE "OrderStatus" ADD VALUE 'ANNULEE';

-- Le retour de stock est un mouvement à part entière, distinct d'un ajustement
-- manuel : on doit pouvoir répondre à « pourquoi ce stock est-il remonté ? ».
ALTER TYPE "StockMovementReason" ADD VALUE 'ANNULATION';

ALTER TABLE "Order" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
                    ADD COLUMN     "cancelReason" TEXT;
