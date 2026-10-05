-- AlterTable
ALTER TABLE "Setting" ADD COLUMN     "bankName" TEXT NOT NULL DEFAULT 'PostFinance AG',
ADD COLUMN     "companyTagline" TEXT NOT NULL DEFAULT 'Distribution Cidrerie du Vulcain CH',
ADD COLUMN     "companyZipCity" TEXT NOT NULL DEFAULT '1619 Les Paccots',
ADD COLUMN     "contactName" TEXT NOT NULL DEFAULT 'Bertrand Baeriswyl',
ADD COLUMN     "invoicePlace" TEXT NOT NULL DEFAULT 'Les Paccots',
ADD COLUMN     "paymentTermsDays" INTEGER NOT NULL DEFAULT 30,
ALTER COLUMN "companyAddress" SET DEFAULT 'Ch. des Moilles 16',
ALTER COLUMN "iban" SET DEFAULT 'CH57 0900 0000 1703 3189 6';

-- Reprise des vraies coordonnées de la cidrerie (modèle Facture_Base.docx) sur la
-- ligne déjà en base. Ne remplace que les valeurs fictives du seed initial ou vides :
-- une saisie faite depuis l'écran Paramètres est préservée.
UPDATE "Setting"
SET "companyAddress" = 'Ch. des Moilles 16'
WHERE "id" = 1 AND ("companyAddress" = 'Chemin du Vulcain, Aubonne, Suisse' OR "companyAddress" = '');

UPDATE "Setting"
SET "iban" = 'CH57 0900 0000 1703 3189 6'
WHERE "id" = 1 AND "iban" = '';
