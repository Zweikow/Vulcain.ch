-- Séries de numérotation distinctes : la facture ne partage plus le numéro de la
-- commande. Le compteur devient générique (série + année) pour accueillir aussi
-- les avoirs le moment venu.

-- 1. Compteur générique
CREATE TABLE "DocumentCounter" (
    "series" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "DocumentCounter_pkey" PRIMARY KEY ("series","year")
);

-- 2. Reprise du compteur de commandes existant sous la série CMD. Sans cette
--    étape, la prochaine commande réutiliserait un numéro déjà attribué.
INSERT INTO "DocumentCounter" ("series", "year", "value")
SELECT 'CMD', "year", "value" FROM "OrderCounter";

DROP TABLE "OrderCounter";

-- 3. Numéro de facture porté par la commande, attribué à l'émission seulement.
ALTER TABLE "Order" ADD COLUMN     "invoiceNumber" TEXT,
                    ADD COLUMN     "invoicedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Order_invoiceNumber_key" ON "Order"("invoiceNumber");
