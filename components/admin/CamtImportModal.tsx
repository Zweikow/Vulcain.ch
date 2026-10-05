'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { formatCHF } from '@/lib/money'
import {
  analyzeCamtFileAction,
  applyCamtReconciliationAction,
} from '@/app/admin/(protected)/commandes/paiements/actions'
import { CamtAnalysisResult } from '@/lib/camt'
import { generateSampleCamtXml } from '@/lib/camt-sample'
import {
  CloseIcon,
  CheckIcon,
  AlertCircleIcon,
  InfoIcon,
  FileTextIcon,
  CoinsIcon,
} from '@/components/admin/AdminIcons'

interface CamtImportModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CamtImportModal({ isOpen, onClose }: CamtImportModalProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [fileName, setFileName] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<CamtAnalysisResult | null>(null)
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successCount, setSuccessCount] = useState<number | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  if (!isOpen) return null

  const handleReset = () => {
    setFileName(null)
    setAnalysis(null)
    setSelectedTxIds([])
    setErrorMessage(null)
    setSuccessCount(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleFileProcess = (file: File) => {
    setErrorMessage(null)
    setSuccessCount(null)
    setFileName(file.name)

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      if (!content) {
        setErrorMessage('Le fichier sélectionné est vide.')
        return
      }

      startTransition(async () => {
        const res = await analyzeCamtFileAction(content, file.name)
        if (res.success && res.data) {
          setAnalysis(res.data)
          // Par défaut, sélectionner toutes les transactions prêtes (EXACT_MATCH)
          const autoSelectable = res.data.items
            .filter((item) => item.status === 'EXACT_MATCH' && item.matchedOrder)
            .map((item) => item.transaction.id)
          setSelectedTxIds(autoSelectable)
        } else {
          setErrorMessage(res.error || "Erreur lors de l'analyse du fichier bancaire.")
        }
      })
    }
    reader.onerror = () => {
      setErrorMessage('Impossible de lire le fichier sélectionné.')
    }
    reader.readAsText(file, 'utf-8')
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileProcess(file)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileProcess(file)
    }
  }

  const handleLoadDemo = () => {
    setErrorMessage(null)
    setSuccessCount(null)
    setFileName('avis-credit-postfinance-demo.xml')

    startTransition(async () => {
      const sampleXml = generateSampleCamtXml()
      const res = await analyzeCamtFileAction(sampleXml, 'avis-credit-postfinance-demo.xml')
      if (res.success && res.data) {
        setAnalysis(res.data)
        const autoSelectable = res.data.items
          .filter((item) => item.status === 'EXACT_MATCH' && item.matchedOrder)
          .map((item) => item.transaction.id)
        setSelectedTxIds(autoSelectable)
      } else {
        setErrorMessage(res.error || "Erreur lors de l'analyse de l'exemple.")
      }
    })
  }

  const toggleSelectTx = (id: string) => {
    if (selectedTxIds.includes(id)) {
      setSelectedTxIds(selectedTxIds.filter((txId) => txId !== id))
    } else {
      setSelectedTxIds([...selectedTxIds, id])
    }
  }

  const handleConfirmReconciliation = () => {
    if (!analysis) return

    const itemsToReconcile = analysis.items
      .filter((item) => selectedTxIds.includes(item.transaction.id) && item.matchedOrder)
      .map((item) => ({
        orderId: item.matchedOrder!.id,
        paidAtDate: item.transaction.bookingDate,
        paymentMethod: item.transaction.structuredRef
          ? `QR-facture (CAMT.054 - ${item.transaction.structuredRef})`
          : 'Virement bancaire (CAMT.054)',
        transactionRef: item.transaction.structuredRef || item.transaction.endToEndId,
      }))

    if (itemsToReconcile.length === 0) {
      setErrorMessage('Aucun encaissement sélectionné pour validation.')
      return
    }

    startTransition(async () => {
      const res = await applyCamtReconciliationAction(itemsToReconcile)
      if (res.success) {
        setSuccessCount(res.count || itemsToReconcile.length)
        router.refresh()
      } else {
        setErrorMessage(res.error || "Erreur lors de l'enregistrement des encaissements.")
      }
    })
  }

  // Calcul du montant sélectionné
  const selectedTotalCents = (analysis?.items || [])
    .filter((item) => selectedTxIds.includes(item.transaction.id) && item.matchedOrder)
    .reduce((sum, item) => sum + item.transaction.amountCents, 0)

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="card max-w-4xl w-full max-h-[90vh] flex flex-col bg-bg-card dark:bg-bg-card-dark border border-border dark:border-border-dark shadow-2xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* En-tête */}
        <div className="p-5 border-b border-border dark:border-border-dark flex items-start justify-between gap-4 bg-bg-page/60 dark:bg-bg-page-dark/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary-text dark:bg-secondary/20 dark:text-primary-text flex items-center justify-center shrink-0">
              <CoinsIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold font-display text-text-primary dark:text-text-primary-dark">
                Rapprochement Bancaire Automatique
              </h2>
              <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-0.5">
                Importation de fichiers standard suisses ISO 20022 (CAMT.054 avis de crédit ou
                CAMT.053 relevé).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-text-tertiary transition-colors"
            title="Fermer"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Corps principal */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-5">
          {/* Alerte Erreur */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200 text-sm flex items-start gap-3">
              <AlertCircleIcon className="w-5 h-5 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <div className="flex-1">
                <p className="font-semibold">Erreur de traitement</p>
                <p className="text-xs mt-0.5">{errorMessage}</p>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-xs underline hover:opacity-75"
              >
                Fermer
              </button>
            </div>
          )}

          {/* Succès après validation */}
          {successCount !== null ? (
            <div className="p-8 text-center flex flex-col items-center gap-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl">
              <div className="w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg">
                <CheckIcon className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold font-display text-emerald-800 dark:text-emerald-200">
                Rapprochement bancaire effectué avec succès !
              </h3>
              <p className="text-sm text-emerald-700 dark:text-emerald-300 max-w-md">
                <strong>{successCount} facture(s)</strong> ont été pointées, acquittées et
                enregistrées avec le mode de paiement bancaire et leur référence
                d&apos;encaissement.
              </p>
              <div className="mt-4 flex items-center gap-3">
                <button onClick={handleReset} className="btn-secondary text-sm py-2 px-4">
                  Importer un autre fichier
                </button>
                <button
                  onClick={onClose}
                  className="btn-primary text-sm py-2 px-4 bg-emerald-700 hover:bg-emerald-800 text-white"
                >
                  Terminer et voir les factures
                </button>
              </div>
            </div>
          ) : !analysis ? (
            /* Étape 1 : Zone de dépôt de fichier XML */
            <div className="flex flex-col gap-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragOver(true)
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isDragOver
                    ? 'border-primary bg-primary/5 dark:border-secondary dark:bg-secondary/10'
                    : 'border-border dark:border-border-dark hover:border-primary/60 dark:hover:border-secondary/60 bg-bg-page/40 dark:bg-bg-page-dark/20'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xml,text/xml"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                <div className="w-16 h-16 rounded-2xl bg-secondary/20 dark:bg-secondary/30 text-primary-text dark:text-primary-text flex items-center justify-center mb-3">
                  <FileTextIcon className="w-8 h-8" />
                </div>

                <p className="text-base font-semibold text-text-primary dark:text-text-primary-dark">
                  Glissez-déposez votre fichier CAMT.054 ou CAMT.053 (.xml)
                </p>
                <p className="text-xs text-text-tertiary dark:text-text-tertiary-dark mt-1 max-w-sm">
                  Téléchargé depuis votre e-banking PostFinance, BCF ou autre banque suisse (Avis de
                  crédit ou relevé XML ISO 20022).
                </p>

                <button
                  type="button"
                  className="btn-secondary text-xs sm:text-sm mt-5 py-2 px-4 font-semibold"
                >
                  Parcourir un fichier...
                </button>
              </div>

              {/* Bouton démo et aide */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2 text-text-secondary dark:text-text-secondary-dark">
                  <InfoIcon className="w-4 h-4 text-primary-text dark:text-primary-text shrink-0" />
                  <span>
                    Vous n&apos;avez pas de fichier réel sous la main ? Testez le mécanisme
                    immédiatement.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleLoadDemo}
                  disabled={isPending}
                  className="btn-secondary text-xs py-1.5 px-3.5 font-semibold text-primary-text dark:text-primary-text hover:bg-slate-200 dark:hover:bg-slate-800 shrink-0"
                >
                  {isPending ? 'Chargement...' : 'Tester avec le fichier démo'}
                </button>
              </div>
            </div>
          ) : (
            /* Étape 2 : Tableau d'analyse & rapprochement */
            <div className="flex flex-col gap-5">
              {/* Résumé chiffré */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl border border-border dark:border-border-dark bg-bg-page/50 dark:bg-bg-page-dark/30 flex flex-col">
                  <span className="text-[11px] text-text-tertiary uppercase tracking-wider font-semibold">
                    Total Détecté
                  </span>
                  <span className="text-xl font-bold font-display text-text-primary dark:text-text-primary-dark">
                    {analysis.totalEntries} virement{analysis.totalEntries > 1 ? 's' : ''}
                  </span>
                  <span className="text-xs text-text-secondary tabular font-medium">
                    {formatCHF(analysis.totalCreditCents)}
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-emerald-300 dark:border-emerald-800/70 bg-emerald-50/60 dark:bg-emerald-950/20 flex flex-col">
                  <span className="text-[11px] text-emerald-800 dark:text-emerald-300 uppercase tracking-wider font-semibold">
                    Prêts à Encaisser
                  </span>
                  <span className="text-xl font-bold font-display text-emerald-700 dark:text-emerald-400">
                    {analysis.matchedCount}
                  </span>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    Correspondance exacte
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-blue-300 dark:border-blue-800/70 bg-blue-50/60 dark:bg-blue-950/20 flex flex-col">
                  <span className="text-[11px] text-blue-800 dark:text-blue-300 uppercase tracking-wider font-semibold">
                    Déjà Réglées
                  </span>
                  <span className="text-xl font-bold font-display text-blue-700 dark:text-blue-400">
                    {analysis.alreadyPaidCount}
                  </span>
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    Ignorées (sécurité)
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-amber-300 dark:border-amber-800/70 bg-amber-50/60 dark:bg-amber-950/20 flex flex-col">
                  <span className="text-[11px] text-amber-800 dark:text-amber-300 uppercase tracking-wider font-semibold">
                    Non Rapprochés
                  </span>
                  <span className="text-xl font-bold font-display text-amber-700 dark:text-amber-400">
                    {analysis.unmatchedCount + analysis.mismatchCount}
                  </span>
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                    À vérifier
                  </span>
                </div>
              </div>

              {/* Table des écritures */}
              <div className="border border-border dark:border-border-dark rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-[360px]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-bg-page dark:bg-bg-page-dark border-b border-border dark:border-border-dark text-text-tertiary uppercase font-semibold">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={
                              analysis.items.filter((i) => i.status === 'EXACT_MATCH').length > 0 &&
                              analysis.items
                                .filter((i) => i.status === 'EXACT_MATCH')
                                .every((i) => selectedTxIds.includes(i.transaction.id))
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTxIds(
                                  analysis.items
                                    .filter((i) => i.status === 'EXACT_MATCH' && i.matchedOrder)
                                    .map((i) => i.transaction.id)
                                )
                              } else {
                                setSelectedTxIds([])
                              }
                            }}
                            className="rounded border-border text-primary-text focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                          />
                        </th>
                        <th className="py-2.5 px-3">Statut</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Facture & Commande</th>
                        <th className="py-2.5 px-3">Débiteur (Client)</th>
                        <th className="py-2.5 px-3 text-right">Montant</th>
                        <th className="py-2.5 px-3">Détails / Réf. Bancaire</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border dark:divide-border-dark">
                      {analysis.items.map((item) => {
                        const isSelected = selectedTxIds.includes(item.transaction.id)
                        const canSelect =
                          item.status === 'EXACT_MATCH' && Boolean(item.matchedOrder)

                        return (
                          <tr
                            key={item.transaction.id}
                            className={`hover:bg-bg-page/40 dark:hover:bg-bg-page-dark/30 transition-colors ${
                              isSelected ? 'bg-secondary/10 dark:bg-secondary/15' : ''
                            }`}
                          >
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="checkbox"
                                disabled={!canSelect}
                                checked={isSelected}
                                onChange={() => toggleSelectTx(item.transaction.id)}
                                className="rounded border-border text-primary-text focus:ring-primary h-3.5 w-3.5 cursor-pointer disabled:opacity-30"
                              />
                            </td>

                            {/* Statut Badge */}
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {item.status === 'EXACT_MATCH' && (
                                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-full text-[10px]">
                                  <CheckIcon className="w-3 h-3 inline" /> Prêt à valider
                                </span>
                              )}
                              {item.status === 'ALREADY_PAID' && (
                                <span className="inline-flex items-center gap-1 font-semibold text-blue-700 bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 px-2 py-0.5 rounded-full text-[10px]">
                                  Déjà acquittée
                                </span>
                              )}
                              {item.status === 'AMOUNT_MISMATCH' && (
                                <span className="inline-flex items-center gap-1 font-semibold text-amber-700 bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 rounded-full text-[10px]">
                                  Montant divergent
                                </span>
                              )}
                              {item.status === 'NO_MATCH' && (
                                <span className="inline-flex items-center gap-1 font-semibold text-rose-700 bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300 px-2 py-0.5 rounded-full text-[10px]">
                                  Non reconnue
                                </span>
                              )}
                              {item.status === 'DEBIT_IGNORED' && (
                                <span className="inline-flex items-center gap-1 font-medium text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 rounded-full text-[10px]">
                                  Débit ignoré
                                </span>
                              )}
                            </td>

                            {/* Date */}
                            <td className="py-2.5 px-3 whitespace-nowrap text-text-secondary dark:text-text-secondary-dark">
                              {item.transaction.bookingDate}
                            </td>

                            {/* Facture & Commande */}
                            <td className="py-2.5 px-3 whitespace-nowrap font-mono">
                              {item.matchedOrder ? (
                                <div className="flex flex-col">
                                  <span className="font-bold text-text-primary dark:text-text-primary-dark">
                                    {item.matchedOrder.invoiceNumber || item.matchedOrder.numero}
                                  </span>
                                  {item.matchedOrder.invoiceNumber && (
                                    <span className="text-[10px] text-text-tertiary">
                                      Cmd {item.matchedOrder.numero}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-text-tertiary italic">—</span>
                              )}
                            </td>

                            {/* Débiteur / Client */}
                            <td className="py-2.5 px-3 max-w-[180px] truncate">
                              <span className="font-medium text-text-primary dark:text-text-primary-dark block truncate">
                                {item.transaction.debtorName ||
                                  item.matchedOrder?.clientName ||
                                  'Inconnu'}
                              </span>
                              {item.matchedOrder &&
                                item.transaction.debtorName &&
                                item.transaction.debtorName !== item.matchedOrder.clientName && (
                                  <span className="text-[10px] text-text-tertiary block truncate">
                                    Client BD : {item.matchedOrder.clientName}
                                  </span>
                                )}
                            </td>

                            {/* Montant */}
                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              <div className="flex flex-col items-end">
                                <span className="font-bold text-text-primary dark:text-text-primary-dark tabular">
                                  {formatCHF(item.transaction.amountCents)}
                                </span>
                                {item.matchedOrder &&
                                  item.matchedOrder.totalCents !== item.transaction.amountCents && (
                                    <span className="text-[10px] text-rose-600 font-semibold tabular">
                                      Attendu : {formatCHF(item.matchedOrder.totalCents)}
                                    </span>
                                  )}
                              </div>
                            </td>

                            {/* Détails & Motif */}
                            <td className="py-2.5 px-3 text-[11px] text-text-secondary dark:text-text-secondary-dark max-w-[220px]">
                              <p className="truncate font-medium">{item.matchReason}</p>
                              {item.transaction.structuredRef && (
                                <p className="font-mono text-[10px] text-text-tertiary truncate">
                                  Réf : {item.transaction.structuredRef}
                                </p>
                              )}
                              {item.transaction.unstructuredRemittance && (
                                <p className="text-[10px] text-text-tertiary truncate">
                                  Comm : {item.transaction.unstructuredRemittance}
                                </p>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pied de page modal */}
        <div className="p-4 border-t border-border dark:border-border-dark flex flex-wrap items-center justify-between gap-3 bg-bg-page/60 dark:bg-bg-page-dark/40">
          <div className="text-xs text-text-tertiary flex items-center gap-2">
            {fileName && (
              <span className="font-mono truncate max-w-xs bg-bg-card dark:bg-bg-card-dark px-2.5 py-1 rounded border border-border dark:border-border-dark">
                {fileName}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {analysis && successCount === null && (
              <button
                type="button"
                onClick={handleReset}
                disabled={isPending}
                className="btn-secondary text-xs sm:text-sm py-2 px-3.5"
              >
                Changer de fichier
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="btn-secondary text-xs sm:text-sm py-2 px-4"
            >
              {successCount !== null ? 'Fermer' : 'Annuler'}
            </button>

            {analysis && successCount === null && (
              <button
                type="button"
                onClick={handleConfirmReconciliation}
                disabled={isPending || selectedTxIds.length === 0}
                className="btn-primary text-xs sm:text-sm py-2 px-4 font-semibold bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-50 flex items-center gap-2 shadow-sm"
              >
                {isPending ? (
                  <span>Validation en cours...</span>
                ) : (
                  <>
                    <CheckIcon className="w-4 h-4" />
                    <span>
                      Encaisser {selectedTxIds.length} facture
                      {selectedTxIds.length > 1 ? 's' : ''} ({formatCHF(selectedTotalCents)})
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
