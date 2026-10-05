-- La cidrerie n'est pas assujettie à la TVA. Faire état d'une TVA qu'on ne
-- perçoit pas n'est pas permis : les documents ne doivent donc plus la mentionner.
-- Le taux reste stocké pour le jour où le seuil de 100 000 CHF sera franchi.
ALTER TABLE "Setting" ADD COLUMN "vatSubject" BOOLEAN NOT NULL DEFAULT false;

-- Les commandes déjà en base portent une TVA calculée avant cette décision.
-- Ce sont toutes des commandes d'essai : on remet le montant à zéro pour qu'il
-- ne contredise pas les documents émis.
UPDATE "Order" SET "vatCents" = 0;
