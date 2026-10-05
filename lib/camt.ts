import { XMLParser } from 'fast-xml-parser'
import { prisma } from '@/lib/prisma'
import { creditorReference, qrReference } from '@/lib/reference'

export interface ParsedCamtTransaction {
  id: string
  bookingDate: string // YYYY-MM-DD
  amountCents: number
  currency: string
  creditDebit: 'CRDT' | 'DBIT'
  debtorName?: string
  debtorIban?: string
  structuredRef?: string
  unstructuredRemittance?: string
  endToEndId?: string
}

export type MatchStatus =
  | 'EXACT_MATCH' // Commande trouvée, impayée, montant correspond exactement
  | 'ALREADY_PAID' // Commande trouvée, mais déjà enregistrée comme payée
  | 'AMOUNT_MISMATCH' // Commande trouvée, mais montant différent
  | 'NO_MATCH' // Aucune commande trouvée
  | 'DEBIT_IGNORED' // Débit bancaire (frais ou sortie) ignoré

export interface ReconciledTransactionItem {
  transaction: ParsedCamtTransaction
  status: MatchStatus
  matchReason: string
  matchedOrder?: {
    id: string
    numero: string
    invoiceNumber: string | null
    clientName: string
    totalCents: number
    paidAt: string | null
    paymentMethod: string | null
  }
}

export interface CamtAnalysisResult {
  fileName?: string
  totalEntries: number
  totalCreditCents: number
  matchedCount: number
  alreadyPaidCount: number
  mismatchCount: number
  unmatchedCount: number
  ignoredDebitCount: number
  items: ReconciledTransactionItem[]
}

/**
 * Extrait le montant en centimes entiers et la devise d'un nœud XML Amt.
 */
function parseXmlAmount(amt: any): { amountCents: number; currency: string } {
  if (amt == null) return { amountCents: 0, currency: 'CHF' }
  const val = typeof amt === 'object' ? amt['#text'] : amt
  const ccy = typeof amt === 'object' && amt['@_Ccy'] ? String(amt['@_Ccy']) : 'CHF'
  const numeric = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'))
  return {
    amountCents: Math.round((numeric || 0) * 100),
    currency: ccy,
  }
}

/**
 * Extrait la date de comptabilisation ou valeur au format YYYY-MM-DD.
 */
function parseXmlDate(entry: any, tx?: any): string {
  const dtVal =
    tx?.BookgDt?.Dt ||
    tx?.BookgDt?.DtTm ||
    tx?.ValDt?.Dt ||
    entry?.BookgDt?.Dt ||
    entry?.BookgDt?.DtTm ||
    entry?.ValDt?.Dt

  if (dtVal) {
    return String(dtVal).slice(0, 10)
  }
  return new Date().toISOString().slice(0, 10)
}

/**
 * Parse le contenu XML d'un fichier CAMT.054 ou CAMT.053 (ISO 20022).
 */
export function parseCamtXml(xmlString: string): ParsedCamtTransaction[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    trimValues: true,
    isArray: (name) => ['Ntfctn', 'Stmt', 'Ntry', 'TxDtls', 'Ustrd'].includes(name),
  })

  let parsed: any
  try {
    parsed = parser.parse(xmlString)
  } catch (err: any) {
    throw new Error(`Format XML invalide : ${err?.message || 'impossible de parser le document'}`)
  }

  const doc = parsed?.Document || parsed
  const root = doc?.BkToCstmrDbtCdtNtfctn || doc?.BkToCstmrStmt

  if (!root) {
    throw new Error(
      "Le document fourni n'est ni un avis de crédit CAMT.054 ni un relevé CAMT.053 conforme ISO 20022."
    )
  }

  const containers = (root.Ntfctn || root.Stmt || []) as any[]
  const transactions: ParsedCamtTransaction[] = []
  let txIndex = 1

  for (const container of containers) {
    const entries = (container.Ntry || []) as any[]

    for (const entry of entries) {
      const entryCdtDbt = String(entry.CdtDbtInd || 'CRDT').toUpperCase() as 'CRDT' | 'DBIT'
      const entryAmt = parseXmlAmount(entry.Amt)
      const entryDate = parseXmlDate(entry)

      const txList = (entry.NtryDtls?.TxDtls || []) as any[]

      if (txList.length > 0) {
        for (const tx of txList) {
          const txCdtDbt = tx.CdtDbtInd
            ? (String(tx.CdtDbtInd).toUpperCase() as 'CRDT' | 'DBIT')
            : entryCdtDbt
          const txAmt = tx.Amt ? parseXmlAmount(tx.Amt) : entryAmt
          const txDate = parseXmlDate(entry, tx)

          // RmtInf : informations de virement
          let structuredRef: string | undefined = undefined
          const cdtrRef = tx.RmtInf?.Strd?.CdtrRefInf?.Ref
          if (cdtrRef) {
            structuredRef = String(cdtrRef).replace(/\s+/g, '')
          }

          let unstructuredRemittance: string | undefined = undefined
          const ustrd = tx.RmtInf?.Ustrd
          if (Array.isArray(ustrd)) {
            unstructuredRemittance = ustrd.join(' ')
          } else if (ustrd) {
            unstructuredRemittance = String(ustrd)
          }

          const debtorName = tx.RltdPties?.Dbtr?.Nm ? String(tx.RltdPties.Dbtr.Nm) : undefined
          const debtorIban = tx.RltdPties?.DbtrAcct?.Id?.IBAN
            ? String(tx.RltdPties.DbtrAcct.Id.IBAN).replace(/\s+/g, '')
            : undefined
          const endToEndId = tx.Refs?.EndToEndId ? String(tx.Refs.EndToEndId) : undefined

          transactions.push({
            id: `tx-${txIndex++}`,
            bookingDate: txDate || entryDate,
            amountCents: txAmt.amountCents,
            currency: txAmt.currency,
            creditDebit: txCdtDbt,
            debtorName,
            debtorIban,
            structuredRef,
            unstructuredRemittance,
            endToEndId,
          })
        }
      } else {
        // Entrée sans détail de transaction séparé
        let structuredRef: string | undefined = undefined
        const cdtrRef = entry.RmtInf?.Strd?.CdtrRefInf?.Ref
        if (cdtrRef) {
          structuredRef = String(cdtrRef).replace(/\s+/g, '')
        }

        let unstructuredRemittance: string | undefined = undefined
        const ustrd = entry.RmtInf?.Ustrd
        if (Array.isArray(ustrd)) {
          unstructuredRemittance = ustrd.join(' ')
        } else if (ustrd) {
          unstructuredRemittance = String(ustrd)
        }

        transactions.push({
          id: `tx-${txIndex++}`,
          bookingDate: entryDate,
          amountCents: entryAmt.amountCents,
          currency: entryAmt.currency,
          creditDebit: entryCdtDbt,
          structuredRef,
          unstructuredRemittance,
        })
      }
    }
  }

  return transactions
}

/**
 * Nettoie une chaîne de caractères pour comparaison souple.
 */
function normalizeStr(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

/**
 * Analyse les transactions CAMT extraites et tente le rapprochement automatique avec la base de données.
 */
export async function analyzeCamtTransactions(
  transactions: ParsedCamtTransaction[],
  fileName?: string
): Promise<CamtAnalysisResult> {
  // Récupérer toutes les commandes actives (non annulées)
  const orders = await prisma.order.findMany({
    where: {
      status: { not: 'ANNULEE' },
    },
    select: {
      id: true,
      numero: true,
      invoiceNumber: true,
      clientName: true,
      totalCents: true,
      paidAt: true,
      paymentMethod: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  // Indexation pré-calculée pour recherche ultra-rapide
  const orderByNumber = new Map<string, (typeof orders)[0]>()
  const orderByInvoice = new Map<string, (typeof orders)[0]>()
  const orderByScorRef = new Map<string, (typeof orders)[0]>()
  const orderByQrrRef = new Map<string, (typeof orders)[0]>()

  for (const o of orders) {
    if (o.numero) {
      orderByNumber.set(o.numero.toUpperCase(), o)
      try {
        const scorNum = creditorReference(o.numero)
        orderByScorRef.set(scorNum.toUpperCase(), o)
      } catch {}
      try {
        const qrrNum = qrReference(o.numero)
        orderByQrrRef.set(qrrNum, o)
      } catch {}
    }

    if (o.invoiceNumber) {
      orderByInvoice.set(o.invoiceNumber.toUpperCase(), o)
      try {
        const scorInv = creditorReference(o.invoiceNumber)
        orderByScorRef.set(scorInv.toUpperCase(), o)
      } catch {}
      try {
        const qrrInv = qrReference(o.invoiceNumber)
        orderByQrrRef.set(qrrInv, o)
      } catch {}
    }
  }

  const results: ReconciledTransactionItem[] = []
  let matchedCount = 0
  let alreadyPaidCount = 0
  let mismatchCount = 0
  let unmatchedCount = 0
  let ignoredDebitCount = 0
  let totalCreditCents = 0

  for (const tx of transactions) {
    if (tx.creditDebit === 'CRDT') {
      totalCreditCents += tx.amountCents
    }

    // 1. Si c'est un débit bancaire (frais ou sortie de fonds), on l'ignore
    if (tx.creditDebit === 'DBIT') {
      ignoredDebitCount++
      results.push({
        transaction: tx,
        status: 'DEBIT_IGNORED',
        matchReason: 'Débit bancaire (sortie de fonds ou frais) ignoré.',
      })
      continue
    }

    let matchedOrder: (typeof orders)[0] | undefined = undefined
    let matchType = ''

    // 2. Recherche par référence structurée (SCOR / QRR)
    if (tx.structuredRef) {
      const cleanRef = tx.structuredRef.toUpperCase().replace(/\s+/g, '')

      // Test direct SCOR
      if (orderByScorRef.has(cleanRef)) {
        matchedOrder = orderByScorRef.get(cleanRef)
        matchType = `Référence structurée SCOR (${cleanRef})`
      }
      // Test direct QRR
      else if (orderByQrrRef.has(cleanRef)) {
        matchedOrder = orderByQrrRef.get(cleanRef)
        matchType = `Référence structurée QRR 27 (${cleanRef})`
      }
      // Test heuristique si la référence contient le numéro de facture ou commande
      else {
        // Ex: RF91FAC20260007 -> FAC-2026-0007
        const facMatch = cleanRef.match(/FAC(\d{4})(\d{4})/)
        if (facMatch) {
          const invKey = `FAC-${facMatch[1]}-${facMatch[2]}`
          if (orderByInvoice.has(invKey)) {
            matchedOrder = orderByInvoice.get(invKey)
            matchType = `Référence déduite ${invKey}`
          }
        }
        const cmdMatch = cleanRef.match(/CMD(\d{4})(\d{4})/)
        if (!matchedOrder && cmdMatch) {
          const cmdKey = `CMD-${cmdMatch[1]}-${cmdMatch[2]}`
          if (orderByNumber.has(cmdKey)) {
            matchedOrder = orderByNumber.get(cmdKey)
            matchType = `Référence déduite ${cmdKey}`
          }
        }
      }
    }

    // 3. Recherche dans la communication libre (Ustrd)
    if (!matchedOrder && tx.unstructuredRemittance) {
      const ustrd = tx.unstructuredRemittance.toUpperCase()

      // Regex pour facture : FAC-AAAA-NNNN ou FAC AAAA NNNN
      const facMatch = ustrd.match(/FAC[- ]?(\d{4})[- ]?(\d{4})/)
      if (facMatch) {
        const invKey = `FAC-${facMatch[1]}-${facMatch[2]}`
        if (orderByInvoice.has(invKey)) {
          matchedOrder = orderByInvoice.get(invKey)
          matchType = `Communication libre (${invKey})`
        }
      }

      // Regex pour commande : CMD-AAAA-NNNN ou CMD AAAA NNNN
      const cmdMatch = ustrd.match(/CMD[- ]?(\d{4})[- ]?(\d{4})/)
      if (!matchedOrder && cmdMatch) {
        const cmdKey = `CMD-${cmdMatch[1]}-${cmdMatch[2]}`
        if (orderByNumber.has(cmdKey)) {
          matchedOrder = orderByNumber.get(cmdKey)
          matchType = `Communication libre (${cmdKey})`
        }
      }
    }

    // 4. Recherche heuristique : Client & Montant exact pour factures en attente
    if (!matchedOrder && tx.debtorName && tx.amountCents > 0) {
      const normalizedDebtor = normalizeStr(tx.debtorName)
      const candidates = orders.filter((o) => {
        if (o.paidAt) return false // Priorité aux factures en attente
        if (o.totalCents !== tx.amountCents) return false
        const clientNorm = normalizeStr(o.clientName)
        return (
          clientNorm.includes(normalizedDebtor) ||
          normalizedDebtor.includes(clientNorm) ||
          normalizedDebtor
            .split(/\s+/)
            .filter((w) => w.length > 2)
            .some((w) => clientNorm.includes(w))
        )
      })

      if (candidates.length === 1) {
        matchedOrder = candidates[0]
        matchType = `Montant exact (${(tx.amountCents / 100).toFixed(2)} CHF) et nom du débiteur concordant`
      }
    }

    // 5. Évaluation du statut de rapprochement
    if (matchedOrder) {
      const formattedMatchedOrder = {
        id: matchedOrder.id,
        numero: matchedOrder.numero,
        invoiceNumber: matchedOrder.invoiceNumber,
        clientName: matchedOrder.clientName,
        totalCents: matchedOrder.totalCents,
        paidAt: matchedOrder.paidAt ? matchedOrder.paidAt.toISOString() : null,
        paymentMethod: matchedOrder.paymentMethod,
      }

      if (matchedOrder.paidAt) {
        alreadyPaidCount++
        results.push({
          transaction: tx,
          status: 'ALREADY_PAID',
          matchReason: `Facture déjà acquittée le ${new Date(matchedOrder.paidAt).toLocaleDateString('fr-CH')}.`,
          matchedOrder: formattedMatchedOrder,
        })
      } else if (matchedOrder.totalCents !== tx.amountCents) {
        mismatchCount++
        results.push({
          transaction: tx,
          status: 'AMOUNT_MISMATCH',
          matchReason: `Montant différent : reçu ${(tx.amountCents / 100).toFixed(2)} CHF au lieu de ${(matchedOrder.totalCents / 100).toFixed(2)} CHF attendus.`,
          matchedOrder: formattedMatchedOrder,
        })
      } else {
        matchedCount++
        results.push({
          transaction: tx,
          status: 'EXACT_MATCH',
          matchReason: `Prête pour validation automatique (${matchType}).`,
          matchedOrder: formattedMatchedOrder,
        })
      }
    } else {
      unmatchedCount++
      results.push({
        transaction: tx,
        status: 'NO_MATCH',
        matchReason:
          'Aucune commande correspondante identifiée. Vérifiez la référence ou le débiteur.',
      })
    }
  }

  return {
    fileName,
    totalEntries: transactions.length,
    totalCreditCents,
    matchedCount,
    alreadyPaidCount,
    mismatchCount,
    unmatchedCount,
    ignoredDebitCount,
    items: results,
  }
}
