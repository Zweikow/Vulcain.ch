'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { formatCHF, proUnitPriceCents, shippingCentsFor, orderVatCents } from '@/lib/money'
import { createManualOrder } from '@/app/admin/(protected)/commandes/nouvelle/actions'
import { OrderStatus } from '@prisma/client'

interface ProductOption {
  id: string
  name: string
  priceCents: number
  stock: number
  bottleSize?: string | null
  category?: { name: string }
}

interface CustomerOption {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  address: string
  npa: string
  city: string
  isPro: boolean
}

interface SettingsProps {
  shippingCents: number
  francoCents: number
  proRatePercent: number
  vatRatePermille: number
  vatSubject: boolean
}

interface OrderLineItem {
  id: string
  productId: string
  productName: string
  listPriceCents: number
  unitPriceCents: number
  quantity: number
  stock: number
  bottleSize?: string | null
  isFreePromo?: boolean
}

export function CreateOrderForm({
  products,
  customers,
  settings,
}: {
  products: ProductOption[]
  customers: CustomerOption[]
  settings: SettingsProps
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // 1. Client
  const [customerMode, setCustomerMode] = useState<'EXISTING' | 'NEW'>('NEW')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [npa, setNpa] = useState('')
  const [city, setCity] = useState('')
  const [isPro, setIsPro] = useState(false)

  // 2. Articles
  const [lines, setLines] = useState<OrderLineItem[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '')
  const [addQuantity, setAddQuantity] = useState<number>(6)

  // 3. Expédition & Statut
  const [shippingOption, setShippingOption] = useState<'STANDARD' | 'RETRAIT' | 'CUSTOM'>(
    'STANDARD'
  )
  const [customShippingCHF, setCustomShippingCHF] = useState<string>('0.00')
  const [status, setStatus] = useState<OrderStatus>('A_TRAITER')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [message, setMessage] = useState('')
  const [notifyCustomer, setNotifyCustomer] = useState(false)
  const [allowNegativeStock, setAllowNegativeStock] = useState(false)

  // Sélection d'un client existant
  const handleSelectCustomer = (id: string) => {
    setSelectedCustomerId(id)
    const cust = customers.find((c) => c.id === id)
    if (cust) {
      setFirstName(cust.firstName)
      setLastName(cust.lastName)
      setEmail(cust.email)
      setPhone(cust.phone || '')
      setAddress(cust.address)
      setNpa(cust.npa)
      setCity(cust.city)
      setIsPro(cust.isPro)

      // Recalcule les prix unitaires si le client est pro
      if (cust.isPro !== isPro) {
        updateLinesForPro(cust.isPro)
      }
    }
  }

  // Bascule du statut Pro
  const handleTogglePro = (newIsPro: boolean) => {
    setIsPro(newIsPro)
    updateLinesForPro(newIsPro)
  }

  function isSummerProduct(prod?: { bottleSize?: string | null; name: string }) {
    if (!prod) return false
    const name = prod.name.toLowerCase()
    return (
      prod.bottleSize === '27.5cl' ||
      name.includes('effervescence') ||
      name.includes('evervescence')
    )
  }

  const updateLinesForPro = (proActive: boolean) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.isFreePromo || line.unitPriceCents === 0) return line
        const newUnitPrice = proActive
          ? proUnitPriceCents(line.listPriceCents, settings.proRatePercent)
          : line.listPriceCents
        return { ...line, unitPriceCents: newUnitPrice }
      })
    )
  }

  const handleApplySummerOffer = (lineId: string) => {
    setLines((prev) => {
      const line = prev.find((l) => l.id === lineId)
      if (!line) return prev
      const setsOfThree = Math.floor(line.quantity / 72)
      if (setsOfThree <= 0) return prev

      const freeBottles = setsOfThree * 24
      const paidBottles = line.quantity - freeBottles
      const unitPrice = isPro
        ? proUnitPriceCents(line.listPriceCents, settings.proRatePercent)
        : line.listPriceCents

      const newLines: OrderLineItem[] = []
      for (const l of prev) {
        if (l.id === lineId) {
          if (paidBottles > 0) {
            newLines.push({
              ...l,
              quantity: paidBottles,
              unitPriceCents: unitPrice,
            })
          }
          newLines.push({
            id: `${line.productId}-free-${Date.now()}`,
            productId: line.productId,
            productName: `${line.productName} — Offre estivale (carton offert)`,
            listPriceCents: line.listPriceCents,
            unitPriceCents: 0,
            quantity: freeBottles,
            stock: line.stock,
            bottleSize: line.bottleSize,
            isFreePromo: true,
          })
        } else {
          newLines.push(l)
        }
      }
      return newLines
    })
  }

  // Ajout d'un article
  const handleAddLine = () => {
    const prod = products.find((p) => p.id === selectedProductId)
    if (!prod) return

    const qty = Math.max(1, addQuantity)
    const unitPrice = isPro
      ? proUnitPriceCents(prod.priceCents, settings.proRatePercent)
      : prod.priceCents

    const isSummer = isSummerProduct(prod)

    if (isSummer && qty >= 72) {
      const setsOfThree = Math.floor(qty / 72)
      const freeBottles = setsOfThree * 24
      const paidBottles = qty - freeBottles

      setLines((prev) => {
        const filtered = prev.filter((l) => l.productId !== prod.id)
        const newLines: OrderLineItem[] = [...filtered]
        if (paidBottles > 0) {
          newLines.push({
            id: `${prod.id}-paid-${Date.now()}`,
            productId: prod.id,
            productName: prod.name,
            listPriceCents: prod.priceCents,
            unitPriceCents: unitPrice,
            quantity: paidBottles,
            stock: prod.stock,
            bottleSize: prod.bottleSize,
          })
        }
        if (freeBottles > 0) {
          newLines.push({
            id: `${prod.id}-free-${Date.now()}`,
            productId: prod.id,
            productName: `${prod.name} — Offre estivale (carton offert)`,
            listPriceCents: prod.priceCents,
            unitPriceCents: 0,
            quantity: freeBottles,
            stock: prod.stock,
            bottleSize: prod.bottleSize,
            isFreePromo: true,
          })
        }
        return newLines
      })
      return
    }

    setLines((prev) => {
      const existingIndex = prev.findIndex((l) => l.productId === prod.id && !l.isFreePromo)
      if (existingIndex >= 0) {
        const totalQty = prev[existingIndex].quantity + qty
        if (isSummer && totalQty >= 72) {
          const setsOfThree = Math.floor(totalQty / 72)
          const freeBottles = setsOfThree * 24
          const paidBottles = totalQty - freeBottles
          const filtered = prev.filter((l) => l.productId !== prod.id)
          const res: OrderLineItem[] = [...filtered]
          if (paidBottles > 0) {
            res.push({
              id: `${prod.id}-paid-${Date.now()}`,
              productId: prod.id,
              productName: prod.name,
              listPriceCents: prod.priceCents,
              unitPriceCents: unitPrice,
              quantity: paidBottles,
              stock: prod.stock,
              bottleSize: prod.bottleSize,
            })
          }
          if (freeBottles > 0) {
            res.push({
              id: `${prod.id}-free-${Date.now()}`,
              productId: prod.id,
              productName: `${prod.name} — Offre estivale (carton offert)`,
              listPriceCents: prod.priceCents,
              unitPriceCents: 0,
              quantity: freeBottles,
              stock: prod.stock,
              bottleSize: prod.bottleSize,
              isFreePromo: true,
            })
          }
          return res
        }

        const updated = [...prev]
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: totalQty,
        }
        return updated
      }

      return [
        ...prev,
        {
          id: `${prod.id}-${Date.now()}`,
          productId: prod.id,
          productName: prod.name,
          listPriceCents: prod.priceCents,
          unitPriceCents: unitPrice,
          quantity: qty,
          stock: prod.stock,
          bottleSize: prod.bottleSize,
        },
      ]
    })
  }

  const handleRemoveLine = (lineId: string) => {
    setLines((prev) => prev.filter((l) => l.id !== lineId))
  }

  const handleUpdateLineQuantity = (lineId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveLine(lineId)
      return
    }
    setLines((prev) => prev.map((l) => (l.id === lineId ? { ...l, quantity } : l)))
  }

  const handleUpdateLinePrice = (lineId: string, priceCHF: string) => {
    const cents = Math.round(parseFloat(priceCHF || '0') * 100)
    setLines((prev) =>
      prev.map((l) => (l.id === lineId ? { ...l, unitPriceCents: Math.max(0, cents) } : l))
    )
  }

  // Calculs financiers
  const subtotalCents = lines.reduce((acc, l) => acc + l.unitPriceCents * l.quantity, 0)
  const discountCents = lines.reduce(
    (acc, l) => acc + Math.max(0, l.listPriceCents - l.unitPriceCents) * l.quantity,
    0
  )

  let calculatedShippingCents = 0
  if (shippingOption === 'STANDARD') {
    calculatedShippingCents = shippingCentsFor(subtotalCents, isPro, settings)
  } else if (shippingOption === 'CUSTOM') {
    calculatedShippingCents = Math.round(parseFloat(customShippingCHF || '0') * 100)
  } else {
    calculatedShippingCents = 0
  }

  const totalCents = subtotalCents + calculatedShippingCents
  const vatCents = orderVatCents(totalCents, settings)

  // Vérification de stock négatif
  const hasStockWarning = lines.some((l) => l.quantity > l.stock)

  // Soumission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (lines.length === 0) {
      setErrorMessage('Veuillez ajouter au moins un article à la commande.')
      return
    }

    if (!firstName || !lastName || !email) {
      setErrorMessage('Veuillez renseigner le nom, prénom et email du client.')
      return
    }

    if (hasStockWarning && !allowNegativeStock) {
      setErrorMessage(
        'Certains articles dépassent le stock disponible. Cochez la confirmation ci-dessous pour forcer le passage en stock négatif / précommande.'
      )
      return
    }

    startTransition(async () => {
      const res = await createManualOrder({
        customer: {
          id: customerMode === 'EXISTING' ? selectedCustomerId : undefined,
          firstName,
          lastName,
          email,
          phone,
          address,
          npa,
          city,
          isPro,
        },
        items: lines.map((l) => ({
          productId: l.productId,
          productName: l.productName,
          quantity: l.quantity,
          unitPriceCents: l.unitPriceCents,
        })),
        shippingOption,
        customShippingCents: calculatedShippingCents,
        status,
        deliveryDate: deliveryDate || undefined,
        message: message || undefined,
        notifyCustomer,
        allowNegativeStock,
      })

      if (res.success && res.orderId) {
        router.push(`/admin/commandes/${res.orderId}`)
      } else {
        setErrorMessage(res.error || 'Une erreur est survenue lors de la création.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errorMessage && (
        <div className="rounded-md bg-red-500/10 border border-red-500/30 p-4 text-sm text-red-600 dark:text-red-400">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* 1. FICHE CLIENT */}
      <section className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-text-primary dark:text-text-primary-dark">
              👤 Coordonnées du client
            </h2>
            <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
              Renseignez les coordonnées ou chargez un client existant
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCustomerMode('NEW')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                customerMode === 'NEW'
                  ? 'bg-primary text-white'
                  : 'bg-bg-page dark:bg-bg-page-dark text-text-secondary hover:text-text-primary'
              }`}
            >
              Nouveau client
            </button>
            <button
              type="button"
              onClick={() => setCustomerMode('EXISTING')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                customerMode === 'EXISTING'
                  ? 'bg-primary text-white'
                  : 'bg-bg-page dark:bg-bg-page-dark text-text-secondary hover:text-text-primary'
              }`}
            >
              Client existant
            </button>
          </div>
        </div>

        {customerMode === 'EXISTING' && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-text-secondary dark:text-text-secondary-dark mb-1">
              Rechercher parmi les clients enregistrés
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => handleSelectCustomer(e.target.value)}
              className="input-field w-full text-sm"
            >
              <option value="">-- Choisir un client ({customers.length}) --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.lastName.toUpperCase()} {c.firstName} ({c.city || 'Suisse'}) — {c.email}{' '}
                  {c.isPro ? '★ PRO' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-text-secondary-dark mb-1">
              Prénom *
            </label>
            <input
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="input-field w-full text-sm"
              placeholder="ex: Bertrand"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-text-secondary-dark mb-1">
              Nom *
            </label>
            <input
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="input-field w-full text-sm"
              placeholder="ex: Baeriswyl"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-text-secondary-dark mb-1">
              Email *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field w-full text-sm"
              placeholder="client@domaine.ch"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-text-secondary-dark mb-1">
              Téléphone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input-field w-full text-sm"
              placeholder="+41 79 123 45 67"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-text-secondary dark:text-text-secondary-dark mb-1">
              Adresse (Rue et numéro)
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="input-field w-full text-sm"
              placeholder="Chemin des Prés 4"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-text-secondary-dark mb-1">
              NPA
            </label>
            <input
              type="text"
              value={npa}
              onChange={(e) => setNpa(e.target.value)}
              className="input-field w-full text-sm"
              placeholder="1170"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-text-secondary-dark mb-1">
              Localité / Ville
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="input-field w-full text-sm"
              placeholder="Aubonne"
            />
          </div>
        </div>

        {/* Option Client Pro */}
        <div className="mt-4 pt-4 border-t border-border dark:border-border-dark flex items-center justify-between">
          <div>
            <span className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
              Tarif Professionnel (Pro)
            </span>
            <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
              Applique la remise pro de {settings.proRatePercent}% sur les produits éligibles
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isPro}
              onChange={(e) => handleTogglePro(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>
      </section>

      {/* 2. SÉLECTION DES ARTICLES */}
      <section className="card p-6">
        <h2 className="text-lg font-semibold text-text-primary dark:text-text-primary-dark mb-1">
          🍾 Articles de la commande
        </h2>
        <p className="text-xs text-text-secondary dark:text-text-secondary-dark mb-4">
          Ajoutez les bouteilles et spécifiez les quantités
        </p>

        {/* Sélecteur d'ajout */}
        <div className="flex flex-wrap items-end gap-3 p-3 rounded-lg bg-bg-page dark:bg-bg-page-dark border border-border dark:border-border-dark mb-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-text-secondary dark:text-text-secondary-dark mb-1">
              Produit
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="input-field w-full text-sm"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {formatCHF(p.priceCents)} (Stock: {p.stock})
                </option>
              ))}
            </select>
            {isSummerProduct(products.find((p) => p.id === selectedProductId)) && (
              <p className="mt-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                🎁 Offre estivale : par tranche de 72 bout. (3 cartons de 24), 24 bout. sont
                offertes automatiquement.
              </p>
            )}
          </div>

          <div className="w-24">
            <label className="block text-xs font-medium text-text-secondary dark:text-text-secondary-dark mb-1">
              Quantité
            </label>
            <input
              type="number"
              min="1"
              value={addQuantity}
              onChange={(e) => setAddQuantity(parseInt(e.target.value, 10) || 1)}
              className="input-field w-full text-sm text-center font-semibold"
            />
          </div>

          <button
            type="button"
            onClick={handleAddLine}
            className="btn-primary text-sm whitespace-nowrap h-[38px] px-4"
          >
            + Ajouter
          </button>
        </div>

        {/* Tableau des lignes */}
        {lines.length === 0 ? (
          <div className="py-8 text-center text-sm text-text-tertiary dark:text-text-tertiary-dark border-2 border-dashed border-border dark:border-border-dark rounded-lg">
            Aucun article dans la commande pour le moment
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border dark:border-border-dark text-xs text-text-tertiary">
                <tr>
                  <th className="py-2 font-medium">Article</th>
                  <th className="py-2 font-medium w-24">Stock</th>
                  <th className="py-2 font-medium w-24">Quantité</th>
                  <th className="py-2 font-medium w-32">Prix unitaire</th>
                  <th className="py-2 font-medium text-right w-28">Total</th>
                  <th className="py-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-border-dark">
                {lines.map((line) => {
                  const isStockWarning = line.quantity > line.stock
                  const isSummer = isSummerProduct({
                    bottleSize: line.bottleSize,
                    name: line.productName,
                  })
                  const canApplySummerOffer = !line.isFreePromo && isSummer && line.quantity >= 72

                  return (
                    <tr key={line.id}>
                      <td className="py-3">
                        <div className="font-medium text-text-primary dark:text-text-primary-dark">
                          {line.productName}
                        </div>
                        {line.isFreePromo ? (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold">
                            🎁 Carton offert (0.00 CHF)
                          </span>
                        ) : (
                          isPro &&
                          line.listPriceCents > line.unitPriceCents && (
                            <div className="text-[11px] text-primary">
                              Tarif Pro ({settings.proRatePercent}% remise)
                            </div>
                          )
                        )}
                        {canApplySummerOffer && (
                          <div className="mt-1.5">
                            <button
                              type="button"
                              onClick={() => handleApplySummerOffer(line.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
                            >
                              🎁 Appliquer l&apos;Offre Estivale (scinder{' '}
                              {Math.floor(line.quantity / 72) * 24} bout. offertes)
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            isStockWarning
                              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {line.stock} disp.
                        </span>
                      </td>
                      <td className="py-3">
                        <input
                          type="number"
                          min="1"
                          value={line.quantity}
                          onChange={(e) =>
                            handleUpdateLineQuantity(line.id, parseInt(e.target.value, 10) || 1)
                          }
                          className="input-field w-16 text-center text-sm py-1 font-semibold"
                        />
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-text-secondary">CHF</span>
                          <input
                            type="number"
                            step="0.05"
                            value={(line.unitPriceCents / 100).toFixed(2)}
                            onChange={(e) => handleUpdateLinePrice(line.id, e.target.value)}
                            className="input-field w-20 text-right text-sm py-1 font-mono"
                          />
                        </div>
                      </td>
                      <td className="py-3 text-right font-mono font-semibold text-text-primary dark:text-text-primary-dark">
                        {formatCHF(line.unitPriceCents * line.quantity)}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(line.id)}
                          className="text-text-tertiary hover:text-red-500 transition-colors p-1"
                          title="Supprimer la ligne"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {hasStockWarning && (
          <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <span className="text-lg">⚠️</span>
            <div className="text-xs text-amber-800 dark:text-amber-300">
              <p className="font-semibold">Stock physique insuffisant pour certains articles.</p>
              <label className="flex items-center gap-2 mt-1.5 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={allowNegativeStock}
                  onChange={(e) => setAllowNegativeStock(e.target.checked)}
                  className="rounded text-primary focus:ring-primary"
                />
                Autoriser la vente en stock négatif / précommande
              </label>
            </div>
          </div>
        )}
      </section>

      {/* 3. EXPÉDITION & OPTIONS */}
      <section className="card p-6">
        <h2 className="text-lg font-semibold text-text-primary dark:text-text-primary-dark mb-4">
          🚚 Livraison & Finalisation
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <label
            className={`flex flex-col p-3 rounded-lg border cursor-pointer transition-all ${
              shippingOption === 'STANDARD'
                ? 'border-primary bg-primary/5'
                : 'border-border dark:border-border-dark hover:bg-bg-page'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold">Poste / Transporteur</span>
              <input
                type="radio"
                name="shipping"
                checked={shippingOption === 'STANDARD'}
                onChange={() => setShippingOption('STANDARD')}
                className="text-primary"
              />
            </div>
            <span className="text-xs text-text-secondary">
              Calculé auto (Franco dès {formatCHF(settings.francoCents)})
            </span>
          </label>

          <label
            className={`flex flex-col p-3 rounded-lg border cursor-pointer transition-all ${
              shippingOption === 'RETRAIT'
                ? 'border-primary bg-primary/5'
                : 'border-border dark:border-border-dark hover:bg-bg-page'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold">Retrait à la cave</span>
              <input
                type="radio"
                name="shipping"
                checked={shippingOption === 'RETRAIT'}
                onChange={() => setShippingOption('RETRAIT')}
                className="text-primary"
              />
            </div>
            <span className="text-xs text-text-secondary">Frais offerts (0.00 CHF)</span>
          </label>

          <label
            className={`flex flex-col p-3 rounded-lg border cursor-pointer transition-all ${
              shippingOption === 'CUSTOM'
                ? 'border-primary bg-primary/5'
                : 'border-border dark:border-border-dark hover:bg-bg-page'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold">Frais personnalisés</span>
              <input
                type="radio"
                name="shipping"
                checked={shippingOption === 'CUSTOM'}
                onChange={() => setShippingOption('CUSTOM')}
                className="text-primary"
              />
            </div>
            {shippingOption === 'CUSTOM' ? (
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs text-text-secondary">CHF</span>
                <input
                  type="number"
                  step="0.05"
                  value={customShippingCHF}
                  onChange={(e) => setCustomShippingCHF(e.target.value)}
                  className="input-field py-0.5 px-2 text-xs w-20 font-mono"
                />
              </div>
            ) : (
              <span className="text-xs text-text-secondary">Montant libre en CHF</span>
            )}
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-text-secondary-dark mb-1">
              Statut initial de la commande
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as OrderStatus)}
              className="input-field w-full text-sm font-medium"
            >
              <option value="A_TRAITER">À traiter (Standard)</option>
              <option value="EN_PREPARATION">En préparation</option>
              <option value="EXPEDIEE">Expédiée / Remise au client</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-text-secondary-dark mb-1">
              Date souhaitée de livraison / retrait
            </label>
            <input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="input-field w-full text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-text-secondary dark:text-text-secondary-dark mb-1">
              Note interne ou instructions de livraison
            </label>
            <textarea
              rows={2}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="ex: Commande prise par téléphone, payée au comptoir..."
              className="input-field w-full text-sm resize-none"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-border dark:border-border-dark">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={notifyCustomer}
              onChange={(e) => setNotifyCustomer(e.target.checked)}
              className="rounded text-primary focus:ring-primary"
            />
            <span className="text-sm text-text-secondary dark:text-text-secondary-dark">
              ✉️ Envoyer un email de confirmation de commande au client
            </span>
          </label>
        </div>
      </section>

      {/* 4. RÉCAPITULATIF FINANCIER & BOUTON D'ACTION */}
      <section className="card p-6 bg-bg-page dark:bg-bg-page-dark border border-border dark:border-border-dark">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between sm:justify-start sm:gap-6 text-text-secondary">
              <span>Sous-total articles :</span>
              <span className="font-mono">{formatCHF(subtotalCents)}</span>
            </div>
            {discountCents > 0 && (
              <div className="flex justify-between sm:justify-start sm:gap-6 text-primary">
                <span>Remise professionnelle :</span>
                <span className="font-mono">-{formatCHF(discountCents)}</span>
              </div>
            )}
            <div className="flex justify-between sm:justify-start sm:gap-6 text-text-secondary">
              <span>Frais de port :</span>
              <span className="font-mono">
                {calculatedShippingCents === 0 ? 'Offerts' : formatCHF(calculatedShippingCents)}
              </span>
            </div>
            <div className="text-[11px] text-text-tertiary">
              Dont TVA ({(settings.vatRatePermille / 10).toFixed(1)}%) : {formatCHF(vatCents)}
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">
            <div className="text-right">
              <span className="text-xs text-text-secondary">Total de la commande</span>
              <div className="text-2xl font-bold font-mono text-primary">
                {formatCHF(totalCents)}
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending || lines.length === 0}
              className="btn-primary px-8 py-3 text-sm font-semibold disabled:opacity-50"
            >
              {isPending ? 'Enregistrement en cours…' : '✓ Créer la commande'}
            </button>
          </div>
        </div>
      </section>
    </form>
  )
}
