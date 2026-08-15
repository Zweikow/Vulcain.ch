import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Connexion par nom d'utilisateur ; l'adresse ne sert que de contact du compte.
  const username = process.env.SEED_ADMIN_USERNAME ?? 'admin'
  const email = process.env.SEED_ADMIN_EMAIL ?? 'commandes@cidrerie-vulcain.ch'
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'changeme123'
  const name = process.env.SEED_ADMIN_NAME ?? 'Administrateur'

  const hash = await bcrypt.hash(password, 12)

  await prisma.user.upsert({
    where: { username },
    update: { role: 'ADMIN' },
    create: { username, email, password: hash, name, role: 'ADMIN' },
  })
  console.log(`✓ Admin créé : ${username} (mot de passe à changer)`)

  const categories = ['Cidre', 'Eau-de-vie', 'Liqueur', 'Cuisine']
  for (const catName of categories) {
    await prisma.category.upsert({
      where: { name: catName },
      update: {},
      create: { name: catName },
    })
  }
  console.log(`✓ ${categories.length} catégories créées`)

  // Réglages typés — une seule ligne, valeurs par défaut du schéma
  await prisma.setting.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } })
  console.log('✓ Paramètres initialisés (port, franco, taux pro, TVA, facturation)')

  // Catalogue de démonstration en centimes — à remplacer par le vrai catalogue
  const cidre = await prisma.category.findUniqueOrThrow({ where: { name: 'Cidre' } })
  const eauDeVie = await prisma.category.findUniqueOrThrow({ where: { name: 'Eau-de-vie' } })

  const produits = [
    {
      name: 'Cidre Doux 2026',
      categoryId: cidre.id,
      year: 2026,
      priceCents: 900,
      stock: 20,
      stockSeuil: 5,
      description: 'Un cidre doux avec des arômes fruités et sucrés',
    },
    {
      name: 'Cidre Brut 2024',
      categoryId: cidre.id,
      year: 2024,
      priceCents: 900,
      stock: 35,
      stockSeuil: 5,
      description: 'Cidre brut aux notes acidulées et rafraîchissantes',
    },
    {
      name: 'Cidre Rosé 2025',
      categoryId: cidre.id,
      year: 2025,
      priceCents: 1000,
      stock: 42,
      stockSeuil: 5,
      description: 'Cidre rosé élégant avec des arômes floraux délicats',
    },
    {
      name: 'Eau-de-vie de pomme',
      categoryId: eauDeVie.id,
      year: null,
      priceCents: 4500,
      stock: 12,
      stockSeuil: 3,
      description: 'Distillée au domaine, fruit net et finale longue',
    },
  ]

  for (const p of produits) {
    const existing = await prisma.product.findFirst({ where: { name: p.name } })
    if (!existing) await prisma.product.create({ data: p })
  }
  console.log(`✓ ${produits.length} produits de démonstration`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
