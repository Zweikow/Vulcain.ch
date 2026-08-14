/**
 * Réinitialisation du mot de passe d'un compte d'administration, en dernier
 * recours : mot de passe oublié, ou premier changement avant toute connexion.
 * L'écran Paramètres reste la voie normale — la cidrerie doit pouvoir le faire
 * sans développeur.
 *
 *   npm run admin:password -- admin "une phrase de passe bien à moi"
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const [username, password] = process.argv.slice(2)

if (!username || !password) {
  console.error('Usage : npm run admin:password -- <nom-utilisateur> "<mot de passe>"')
  process.exit(1)
}
if (password.length < 12) {
  console.error('Mot de passe trop court : douze caractères au minimum.')
  process.exit(1)
}

const user = await prisma.user.findUnique({ where: { username }, select: { id: true } })
if (!user) {
  const known = await prisma.user.findMany({ select: { username: true } })
  console.error(
    `Aucun compte « ${username} ». Comptes existants : ${known.map((u) => u.username).join(', ') || 'aucun'}`
  )
  await prisma.$disconnect()
  process.exit(1)
}

await prisma.user.update({
  where: { id: user.id },
  data: { password: await bcrypt.hash(password, 12) },
})
console.log(`Mot de passe de « ${username} » mis à jour.`)
await prisma.$disconnect()
