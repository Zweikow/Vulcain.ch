import { prisma } from '@/lib/prisma'
import { formatCHF } from '@/lib/money'

export default async function ProduitsPage() {
  const produits = await prisma.product.findMany({
    include: { category: { select: { name: true } } },
    orderBy: { name: 'asc' },
  })

  const stockBasCount = produits.filter((p) => p.active && p.stock <= p.stockSeuil).length

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary dark:text-text-primary-dark">
            Produits
          </h1>
          <p className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">
            Gérez le catalogue de la cidrerie
          </p>
        </div>
        <button
          className="btn-primary flex items-center gap-2 opacity-50 cursor-not-allowed"
          disabled
          title="Bientôt disponible"
        >
          + Ajouter un produit
        </button>
      </div>

      {/* Alerte stock bas */}
      {stockBasCount > 0 && (
        <div className="flex items-center gap-3 bg-[#FFF8E1] dark:bg-[#3d2a0a] border border-[#FFB300] dark:border-[#FF9800]/40 rounded-lg px-4 py-3 mb-6 text-sm text-text-warning dark:text-[#FF9800]">
          <span>⚠️</span>
          <span>
            <span className="font-semibold">
              {stockBasCount} produit{stockBasCount > 1 ? 's' : ''}
            </span>{' '}
            {stockBasCount > 1 ? 'ont' : 'a'} un stock en dessous du seuil d&apos;alerte.
          </span>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border dark:border-border-dark bg-bg-page dark:bg-bg-page-dark">
              <th className="text-left px-4 py-3 font-medium text-text-secondary dark:text-text-secondary-dark">
                Nom
              </th>
              <th className="text-left px-4 py-3 font-medium text-text-secondary dark:text-text-secondary-dark">
                Catégorie
              </th>
              <th className="text-left px-4 py-3 font-medium text-text-secondary dark:text-text-secondary-dark">
                Prix
              </th>
              <th className="text-left px-4 py-3 font-medium text-text-secondary dark:text-text-secondary-dark">
                Stock
              </th>
              <th className="text-left px-4 py-3 font-medium text-text-secondary dark:text-text-secondary-dark">
                Seuil
              </th>
              <th className="text-left px-4 py-3 font-medium text-text-secondary dark:text-text-secondary-dark">
                Statut
              </th>
            </tr>
          </thead>
          <tbody>
            {produits.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-text-tertiary dark:text-text-tertiary-dark"
                >
                  Aucun produit
                </td>
              </tr>
            ) : (
              produits.map((produit) => {
                const isLowStock = produit.active && produit.stock <= produit.stockSeuil
                return (
                  <tr
                    key={produit.id}
                    className="border-b border-border dark:border-border-dark last:border-0 hover:bg-bg-page/50 dark:hover:bg-bg-page-dark/50"
                  >
                    <td className="px-4 py-3 font-medium text-text-primary dark:text-text-primary-dark">
                      {produit.name}
                    </td>
                    <td className="px-4 py-3 text-text-secondary dark:text-text-secondary-dark">
                      {produit.category.name}
                    </td>
                    <td className="px-4 py-3 text-text-primary dark:text-text-primary-dark">
                      {formatCHF(produit.priceCents)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 font-medium ${
                          isLowStock
                            ? 'text-text-error dark:text-[#EF5350]'
                            : 'text-text-primary dark:text-text-primary-dark'
                        }`}
                      >
                        {isLowStock && <span>🔴</span>}
                        {produit.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary dark:text-text-secondary-dark">
                      {produit.stockSeuil}
                    </td>
                    <td className="px-4 py-3">
                      {produit.active ? (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-pill bg-[#E8F5E9] dark:bg-[#1e3326] text-text-success dark:text-[#81C784]">
                          Actif
                        </span>
                      ) : (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-pill bg-[#FFF8E1] dark:bg-[#3d2a0a] text-text-warning dark:text-[#FF9800]">
                          Inactif
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
