import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/guards'
import { ACTION_LABELS } from '@/lib/audit'

const stamp = new Intl.DateTimeFormat('fr-CH', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

// Teintes reprises des statuts : le journal se lit d'un coup d'œil.
const ACTION_TONE: Record<string, string> = {
  COMMANDE_CREEE: 'bg-[#E3F2FD] text-[#1565C0]',
  STATUT_MODIFIE: 'bg-[#FFF8E1] text-text-warning',
  FACTURE_EMISE: 'bg-[#E8F5E9] text-text-success',
  TARIF_BASCULE: 'bg-accent-mauve-dark text-white',
  COMMANDE_ANNULEE: 'bg-[#FDF2F2] text-[#C62828]',
  COMMANDE_SUPPRIMEE: 'bg-[#FDF2F2] text-[#C62828]',
}

export default async function JournalPage() {
  await requireAdmin()

  const entries = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-[26px] font-semibold text-text-primary dark:text-text-primary-dark">
          Journal d&apos;activité
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-text-secondary-dark">
          Qui a fait quoi sur les commandes. Visible par les administrateurs seulement ·{' '}
          {entries.length} dernière{entries.length > 1 ? 's' : ''} entrée
          {entries.length > 1 ? 's' : ''}
        </p>
      </div>

      <div className="card overflow-hidden">
        {entries.length === 0 ? (
          <p className="p-8 text-center text-sm text-text-tertiary dark:text-text-tertiary-dark">
            Aucune activité enregistrée pour l&apos;instant.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-page text-left text-[11px] uppercase tracking-[.08em] text-text-secondary dark:border-border-dark dark:bg-bg-page-dark dark:text-text-secondary-dark">
                  <th className="px-4 py-3 font-semibold">Quand</th>
                  <th className="px-4 py-3 font-semibold">Qui</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                  <th className="px-4 py-3 font-semibold">Commande</th>
                  <th className="px-4 py-3 font-semibold">Détail</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b border-border-light last:border-0 dark:border-border-light-dark"
                  >
                    <td className="tabular whitespace-nowrap px-4 py-3 text-text-secondary dark:text-text-secondary-dark">
                      {stamp.format(e.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-medium text-text-primary dark:text-text-primary-dark">
                      {e.actorLabel}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-pill px-2.5 py-0.5 text-xs font-semibold ${
                          ACTION_TONE[e.action] ?? 'bg-border-light text-text-secondary'
                        }`}
                      >
                        {ACTION_LABELS[e.action]}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {e.orderId ? (
                        <Link
                          href={`/admin/commandes/${e.orderId}`}
                          className="text-text-primary hover:underline dark:text-text-primary-dark"
                        >
                          {e.orderNumero}
                        </Link>
                      ) : (
                        <span
                          className="text-text-tertiary line-through dark:text-text-tertiary-dark"
                          title="Commande supprimée"
                        >
                          {e.orderNumero}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-secondary dark:text-text-secondary-dark">
                      {e.detail ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
