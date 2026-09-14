const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('=== Réinitialisation complète des commandes, factures et clients ===')

  // 1. Suppression des logs d'emails de commandes
  const emailLogsDeleted = await prisma.orderEmailLog.deleteMany({})
  console.log(`✓ EmailLogs supprimés : ${emailLogsDeleted.count}`)

  // 2. Suppression des lignes de commandes
  const orderItemsDeleted = await prisma.orderItem.deleteMany({})
  console.log(`✓ OrderItems supprimés : ${orderItemsDeleted.count}`)

  // 3. Suppression des mouvements de stock historiques
  const stockMovementsDeleted = await prisma.stockMovement.deleteMany({})
  console.log(`✓ StockMovements supprimés : ${stockMovementsDeleted.count}`)

  // 4. Suppression de toutes les commandes et factures
  const ordersDeleted = await prisma.order.deleteMany({})
  console.log(`✓ Commandes / Factures supprimées : ${ordersDeleted.count}`)

  // 5. Suppression de tous les clients (comptes de test)
  const customersDeleted = await prisma.customer.deleteMany({})
  console.log(`✓ Clients supprimés : ${customersDeleted.count}`)

  // 6. Réinitialisation des compteurs de documents (CMD, FAC)
  const countersDeleted = await prisma.documentCounter.deleteMany({})
  console.log(`✓ Compteurs de documents réinitialisés : ${countersDeleted.count}`)

  // 7. Nettoyage des journaux d'audit
  const auditLogsDeleted = await prisma.auditLog.deleteMany({})
  console.log(`✓ Logs d'audit supprimés : ${auditLogsDeleted.count}`)

  // 8. Vérification de l'intégrité des produits et stocks conservés
  const products = await prisma.product.findMany({
    select: { id: true, name: true, stock: true, stockSeuil: true, active: true },
    orderBy: { name: 'asc' },
  })
  console.log(`\n--- État des Produits (${products.length} produits conservés) ---`)
  products.forEach((p) => {
    console.log(
      `- ${p.name} : stock = ${p.stock} (seuil alerte: ${p.stockSeuil}, actif: ${p.active})`
    )
  })

  // 9. Vérification des comptes utilisateurs
  const users = await prisma.user.findMany({
    select: { id: true, username: true, role: true },
  })
  console.log(`\n--- Comptes Utilisateurs (${users.length} comptes conservés) ---`)
  users.forEach((u) => {
    console.log(`- ${u.username} (${u.role})`)
  })

  // 10. Vérification des promotions actives
  const promotions = await prisma.promotion.findMany({
    select: { id: true, name: true, type: true, active: true, badgeText: true },
  })
  console.log(`\n--- Promotions (${promotions.length} promotion conservée) ---`)
  promotions.forEach((pr) => {
    console.log(`- ${pr.name} (${pr.type}, active: ${pr.active}, badge: ${pr.badgeText})`)
  })

  console.log('\n=== Réinitialisation terminée avec succès : la base repart de zéro ! ===')
}

main()
  .catch((e) => {
    console.error('Erreur lors de la réinitialisation :', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
