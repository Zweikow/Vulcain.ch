-- Comptes multiples avec rôles, et journal d'activité sur les commandes.

CREATE TYPE "Role" AS ENUM ('ADMIN', 'PREPARATEUR');

CREATE TYPE "AuditAction" AS ENUM (
  'COMMANDE_CREEE', 'STATUT_MODIFIE', 'FACTURE_EMISE',
  'TARIF_BASCULE', 'COMMANDE_ANNULEE', 'COMMANDE_SUPPRIMEE'
);

-- Les nouveaux comptes sont préparateurs par défaut ; le compte existant est
-- l'administrateur et doit le rester, sans quoi plus personne ne pourrait
-- gérer les comptes ni consulter le journal.
ALTER TABLE "User" ADD COLUMN "role" "Role" NOT NULL DEFAULT 'PREPARATEUR';
UPDATE "User" SET "role" = 'ADMIN';

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" "AuditAction" NOT NULL,
    "orderNumero" TEXT NOT NULL,
    "orderId" TEXT,
    "detail" TEXT,
    "userId" TEXT,
    "actorLabel" TEXT NOT NULL,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- Le journal survit à la suppression d'un compte : l'auteur reste lisible
-- grâce à actorLabel, seul le lien est rompu.
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
