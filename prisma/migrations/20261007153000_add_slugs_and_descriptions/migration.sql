-- Migration: Ajout des slugs et descriptions pour SEO
-- 1. Ajout des colonnes en mode temporairement nullable

ALTER TABLE "Category" ADD COLUMN "slug" TEXT;
ALTER TABLE "Category" ADD COLUMN "description" TEXT;

ALTER TABLE "Producer" ADD COLUMN "slug" TEXT;
ALTER TABLE "Producer" ADD COLUMN "description" TEXT;
ALTER TABLE "Producer" ADD COLUMN "region" TEXT;
ALTER TABLE "Producer" ADD COLUMN "photoUrl" TEXT;

ALTER TABLE "Product" ADD COLUMN "slug" TEXT;

-- 2. Remplissage des slugs des categories
UPDATE "Category" SET "slug" = 'offre-speciale-ete' WHERE "name" = 'Offre spéciale été';
UPDATE "Category" SET "slug" = 'cidre' WHERE "name" = 'Cidre';
UPDATE "Category" SET "slug" = 'liquoreux' WHERE "name" = 'Liquoreux';
UPDATE "Category" SET "slug" = 'cidre-de-cuisine' WHERE "name" = 'Cidre de cuisine';
UPDATE "Category" SET "slug" = 'cat-' || "id" WHERE "slug" IS NULL;

-- 3. Remplissage des slugs et donnees des producteurs
UPDATE "Producer" 
SET "slug" = 'jacques-perritaz',
    "region" = 'Le Mouret, Fribourg',
    "photoUrl" = '/images/histoire/jacques-perritaz.jpg',
    "description" = 'Pionnier du cidre naturel en Suisse, Jacques Perritaz élabore au Mouret (Fribourg) à la Cidrerie du Vulcain des cidres et poirés de gastronomie issus d''arbres hautes-tiges centenaires non traités, vinifiés en fermentation spontanée.'
WHERE "name" = 'Jacques Perritaz';

UPDATE "Producer" SET "slug" = 'heftig' WHERE "name" = 'Heftig';
UPDATE "Producer" SET "slug" = 'prod-' || "id" WHERE "slug" IS NULL;

-- 4. Remplissage des slugs des produits
UPDATE "Product" SET "slug" = 'cidre-doux-2026' WHERE "articleNumber" = 1;
UPDATE "Product" SET "slug" = 'cidre-brut-2024' WHERE "articleNumber" = 2;
UPDATE "Product" SET "slug" = 'forget-cidre-rose-2025' WHERE "articleNumber" = 3;
UPDATE "Product" SET "slug" = 'cidre-effervescence-2021' WHERE "articleNumber" = 5;
UPDATE "Product" SET "slug" = 'poire-comment-2022' WHERE "articleNumber" = 6;
UPDATE "Product" SET "slug" = 'efferverscence-2028' WHERE "articleNumber" = 7;
UPDATE "Product" SET "slug" = 'poire-la-premoudiere-2022' WHERE "articleNumber" = 8;
UPDATE "Product" SET "slug" = 'poire-fondue-non-etiq-2018' WHERE "articleNumber" = 9;
UPDATE "Product" SET "slug" = 'cidre-evervescence-pack-ete-3-cartons-2-1-offert-2021' WHERE "articleNumber" = 10;
UPDATE "Product" SET "slug" = 'cidre-effervescence-2022' WHERE "articleNumber" = 11;
UPDATE "Product" SET "slug" = 'new-poire-comment-2022' WHERE "articleNumber" = 12;
UPDATE "Product" SET "slug" = 'poire-la-premoudiere-2022-2' WHERE "articleNumber" = 13;
UPDATE "Product" SET "slug" = 'trois-pepins-2023' WHERE "articleNumber" = 14;
UPDATE "Product" SET "slug" = 'lande-foy-2022' WHERE "articleNumber" = 15;
UPDATE "Product" SET "slug" = 'belle-brutale-2017' WHERE "articleNumber" = 16;
UPDATE "Product" SET "slug" = 'brute-bestiale-2017' WHERE "articleNumber" = 17;
UPDATE "Product" SET "slug" = 'turgowy-2019' WHERE "articleNumber" = 18;
UPDATE "Product" SET "slug" = 'turgowy-2020' WHERE "articleNumber" = 19;
UPDATE "Product" SET "slug" = 'brute-de-rue-2020' WHERE "articleNumber" = 20;
UPDATE "Product" SET "slug" = 'cidre-de-fer-2020' WHERE "articleNumber" = 21;
UPDATE "Product" SET "slug" = 'la-fribourgeoise-2021' WHERE "articleNumber" = 22;
UPDATE "Product" SET "slug" = 'premiers-emois-2021' WHERE "articleNumber" = 23;
UPDATE "Product" SET "slug" = 'brute-de-rue-2021' WHERE "articleNumber" = 24;
UPDATE "Product" SET "slug" = 'a-propos-dailes-2021' WHERE "articleNumber" = 25;
UPDATE "Product" SET "slug" = 'quatre-pepins-2022' WHERE "articleNumber" = 26;
UPDATE "Product" SET "slug" = 'brute-de-rue-2022' WHERE "articleNumber" = 27;
UPDATE "Product" SET "slug" = 'turgowy-2023' WHERE "articleNumber" = 28;
UPDATE "Product" SET "slug" = 'baie-de-rue-2023' WHERE "articleNumber" = 29;
UPDATE "Product" SET "slug" = 'quatre-pepins-2023' WHERE "articleNumber" = 30;
UPDATE "Product" SET "slug" = 'trois-pepins-2010' WHERE "articleNumber" = 31;
UPDATE "Product" SET "slug" = 'cidre-glace-2012' WHERE "articleNumber" = 32;
UPDATE "Product" SET "slug" = 'botsi-de-glace-2017' WHERE "articleNumber" = 33;
UPDATE "Product" SET "slug" = 'produit-' || "articleNumber" WHERE "slug" IS NULL;

-- 5. Passage des colonnes slug a NOT NULL et creation des index uniques
ALTER TABLE "Category" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

ALTER TABLE "Producer" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "Producer_slug_key" ON "Producer"("slug");

ALTER TABLE "Product" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
