import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@cidrerie-vulcain.ch'
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'changeme123'
  const name = process.env.SEED_ADMIN_NAME ?? 'Administrateur'

  const hash = await bcrypt.hash(password, 12)

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, password: hash, name },
  })
  console.log(`✓ Admin créé : ${email}`)

  const categories = ['Cidre', 'Eau-de-vie', 'Liqueur', 'Cuisine']
  for (const catName of categories) {
    await prisma.category.upsert({
      where: { name: catName },
      update: {},
      create: { name: catName },
    })
  }
  console.log(`✓ ${categories.length} catégories créées`)

  const settings = [
    { key: 'adresse', value: 'Chemin du Vulcain, Aubonne, Suisse' },
    { key: 'email', value: 'commandes@cidrerie-vulcain.ch' },
    { key: 'telephone', value: '' },
    { key: 'texte_accueil', value: 'Bienvenue à la Cidrerie du Vulcain' },
  ]
  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    })
  }
  console.log(`✓ ${settings.length} paramètres initialisés`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
