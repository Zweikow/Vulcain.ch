-- Rôle intermédiaire : le gestionnaire tient les commandes et le catalogue,
-- sans accéder aux réglages de facturation, aux comptes ni au journal.
-- Les comptes existants gardent leur rôle : le passage d'un préparateur en
-- gestionnaire est une décision d'exploitation, pas d'un script de migration.
ALTER TYPE "Role" ADD VALUE 'GESTIONNAIRE' AFTER 'ADMIN';
