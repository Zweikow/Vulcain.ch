-- La connexion au back-office se fait par nom d'utilisateur, pas par adresse.
-- L'adresse devient facultative et sert uniquement de contact du compte.

ALTER TABLE "User" ADD COLUMN "username" TEXT;

-- Reprise des comptes existants : la partie locale de l'adresse fait un nom
-- d'utilisateur naturel (admin@… devient admin).
UPDATE "User" SET "username" = split_part("email", '@', 1) WHERE "username" IS NULL;

-- L'adresse admin@cidrerie-vulcain.ch n'existe pas ; la vraie boîte est
-- commandes@cidrerie-vulcain.ch.
UPDATE "User" SET "email" = 'commandes@cidrerie-vulcain.ch'
WHERE "email" = 'admin@cidrerie-vulcain.ch';

ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
