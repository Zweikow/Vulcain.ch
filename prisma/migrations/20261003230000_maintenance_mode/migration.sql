-- Mode maintenance de la boutique. Colonne ajoutée avec une valeur par défaut :
-- le code déjà déployé sur la même base l'ignore et continue de fonctionner.
ALTER TABLE "Setting" ADD COLUMN "maintenanceMode" BOOLEAN NOT NULL DEFAULT false;
