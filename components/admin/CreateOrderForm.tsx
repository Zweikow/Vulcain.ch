'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { formatCHF, proUnitPriceCents, shippingCentsFor, orderVatCents } from '@/lib/money'
import { createManualOrder } from '@/app/admin/(protected)/commandes/nouvelle/actions'
import { OrderStatus } from '@prisma/client'
import {
  AlertCircleIcon,
  UserIcon,
  BottleIcon,
  GiftIcon,
  CloseIcon,
  TruckIcon,
  MailIcon,
  CheckIcon,
} from '@/components/admin/AdminIcons'

interface ProductOption {
  id: string
  name: string
  priceCents: number
  stock: number
  bottleSize?: string | null
  bottlesPerUnit?: number
  category?: { name: string }
  promotions?: Array<{
    id: string
    name: string
    type: 'BUY_X_GET_Y_FREE' | 'PERCENTAGE' | 'FIXED_DISCOUNT'
    buyQuantity?: number | null
    getFreeQuantity?: number | null
    discountPercent?: number | null
    discountCents?: number | null
  }>
}

interface CustomerOption {
  id: string
  customerNumber?: number | null
  firstName: string
  lastName: string
  email: string
  phone: string | null
  address: string
  npa: string
  city: string
  isPro: boolean
  proRatePercent?: number | null
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
  bottlesPerUnit?: number
  stock: number
  bottleSize?: string | null
  categoryName?: string
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
  const [customProRate, setCustomProRate] = useState<number | null>(null)
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
      setCustomProRate(cust.proRatePercent ?? null)

      // Recalcule les prix unitaires selon le taux pro du client
      if (cust.isPro) {
        updateLinesForPro(true, cust.proRatePercent)
      } else {
        updateLinesForPro(false)
      }
    }
  }

  // Bascule du statut Pro
  const handleTogglePro = (newIsPro: boolean) => {
    setIsPro(newIsPro)
    updateLinesForPro(newIsPro)
  }

  const updateLinesForPro = (proActive: boolean, specificRate?: number | null) => {
    const rateToUse =
      specificRate !== undefined
        ? (specificRate ?? settings.proRatePercent)
        : (customProRate ?? settings.proRatePercent)

    setLines((prev) =>
      prev.map((line) => {
        if (line.isFreePromo || line.unitPriceCents === 0) return line
        const newUnitPrice = proActive
          ? proUnitPriceCents(line.listPriceCents, rateToUse)
          : line.listPriceCents
        return { ...line, unitPriceCents: newUnitPrice }
      })
    )
  }

  const handleApplyPromo = (lineId: string) => {
    setLines((prev) => {
      const line = prev.find((l) => l.id === lineId)
      if (!line) return prev
      const prod = products.find((p) => p.id === line.productId)
      const promo = prod?.promotions?.[0]
      if (
        !promo ||
        promo.type !== 'BUY_X_GET_Y_FREE' ||
        !promo.buyQuantity ||
        !promo.getFreeQuantity
      )
        return prev

      const sets = Math.floor(line.quantity / promo.buyQuantity)
      if (sets <= 0) return prev

      const freeUnits = sets * promo.getFreeQuantity
      const paidUnits = line.quantity - freeUnits
      const unitPrice = isPro
        ? proUnitPriceCents(line.listPriceCents, settings.proRatePercent)
        : line.listPriceCents

      const newLines: OrderLineItem[] = []
      for (const l of prev) {
        if (l.id === lineId) {
          if (paidUnits > 0) {
            newLines.push({
              ...l,
              quantity: paidUnits,
              unitPriceCents: unitPrice,
            })
          }
          newLines.push({
            id: `${line.productId}-free-${Date.now()}`,
            productId: line.productId,
            productName: `${line.productName} — ${promo.name} (${freeUnits} offert${freeUnits > 1 ? 's' : ''})`,
            listPriceCents: line.listPriceCents,
            unitPriceCents: 0,
            quantity: freeUnits,
            stock: line.stock,
            bottleSize: line.bottleSize,
            bottlesPerUnit: line.bottlesPerUnit,
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

    const promo = prod.promotions?.[0]
    const bpu = prod.bottlesPerUnit || 1

    if (promo && promo.type === 'BUY_X_GET_Y_FREE' && promo.buyQuantity && promo.getFreeQuantity) {
      const buyQty = promo.buyQuantity
      const freeQty = promo.getFreeQuantity

      setLines((prev) => {
        const existingLine = prev.find((l) => l.productId === prod.id && !l.isFreePromo)
        const totalQty = (existingLine ? existingLine.quantity : 0) + qty

        const filtered = prev.filter((l) => l.productId !== prod.id)
        const newLines: OrderLineItem[] = [...filtered]

        if (totalQty >= buyQty) {
          const sets = Math.floor(totalQty / buyQty)
          const freeUnits = sets * freeQty
          const paidUnits = totalQty - freeUnits

          if (paidUnits > 0) {
            newLines.push({
              id: `${prod.id}-paid-${Date.now()}`,
              productId: prod.id,
              productName: prod.name,
              listPriceCents: prod.priceCents,
              unitPriceCents: unitPrice,
              quantity: paidUnits,
              stock: prod.stock,
              bottleSize: prod.bottleSize,
              bottlesPerUnit: bpu,
            })
          }
          if (freeUnits > 0) {
            newLines.push({
              id: `${prod.id}-free-${Date.now()}`,
              productId: prod.id,
              productName: `${prod.name} — ${promo.name} (${freeUnits} offert${freeUnits > 1 ? 's' : ''})`,
              listPriceCents: prod.priceCents,
              unitPriceCents: 0,
              quantity: freeUnits,
              stock: prod.stock,
              bottleSize: prod.bottleSize,
              bottlesPerUnit: bpu,
              isFreePromo: true,
            })
          }
        } else {
          newLines.push({
            id: `${prod.id}-${Date.now()}`,
            productId: prod.id,
            productName: prod.name,
            listPriceCents: prod.priceCents,
            unitPriceCents: unitPrice,
            quantity: totalQty,
            stock: prod.stock,
            bottleSize: prod.bottleSize,
            bottlesPerUnit: bpu,
          })
        }
        return newLines
      })
      return
    }

    setLines((prev) => {
      const existingIndex = prev.findIndex((l) => l.productId === prod.id && !l.isFreePromo)
      if (existingIndex >= 0) {
        const updated = [...prev]
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + qty,
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
          bottlesPerUnit: bpu,
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
        <div className="rounded-md bg-red-500/10 border border-red-500/30 p-4 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertCircleIcon className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 1. FICHE CLIENT */}
      <section className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-text-primary dark:text-text-primary-dark flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-primary" /> Coordonnées du client
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
                  {c.customerNumber ? `N° ${c.customerNumber} · ` : ''}
                  {c.lastName.toUpperCase()} {c.firstName} ({c.city || 'Suisse'}) — {c.email}{' '}
                  {c.isPro ? `[PRO -${c.proRatePercent ?? settings.proRatePercent}%]` : ''}
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
        <h2 className="text-lg font-semibold text-text-primary dark:text-text-primary-dark mb-1 flex items-center gap-2">
          <BottleIcon className="w-5 h-5 text-primary" /> Articles de la commande
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
            {(() => {
              const selProd = products.find((p) => p.id === selectedProductId)
              const promo = selProd?.promotions?.[0]
              if (!promo) return null
              return (
                <p className="mt-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                  <GiftIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {promo.name} :{' '}
                    {promo.type === 'BUY_X_GET_Y_FREE'
                      ? `pour ${promo.buyQuantity} unité(s) achetée(s), ${promo.getFreeQuantity} est offerte.`
                      : promo.type === 'PERCENTAGE'
                        ? `remise de ${promo.discountPercent}%.`
                        : `rabais de ${formatCHF(promo.discountCents ?? 0)}.`}
                  </span>
                </p>
              )
            })()}
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
                  const prod = products.find((p) => p.id === line.productId)
                  const promo = prod?.promotions?.[0]
                  const canApplyPromo =
                    !line.isFreePromo &&
                    promo?.type === 'BUY_X_GET_Y_FREE' &&
                    promo.buyQuantity &&
                    promo.getFreeQuantity &&
                    line.quantity >= promo.buyQuantity

                  return (
                    <tr key={line.id}>
                      <td className="py-3">
                        <div className="font-medium text-text-primary dark:text-text-primary-dark">
                          {line.productName}
                        </div>
                        {line.isFreePromo ? (
                          <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold">
                            <GiftIcon className="w-3 h-3 shrink-0" /> Offre appliquée (0.00 CHF)
                          </span>
                        ) : (
                          isPro &&
                          line.listPriceCents > line.unitPriceCents && (
                            <div className="text-[11px] text-primary">
                              Tarif Pro ({settings.proRatePercent}% remise)
                            </div>
                          )
                        )}
                        {canApplyPromo && promo && (
                          <div className="mt-1.5">
                            <button
                              type="button"
                              onClick={() => handleApplyPromo(line.id)}
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
                            >
                              <GiftIcon className="w-3.5 h-3.5 shrink-0" />
                              <span>
                                Appliquer {promo.name} (scinder{' '}
                                {Math.floor(line.quantity / promo.buyQuantity!) *
                                  promo.getFreeQuantity!}{' '}
                                {line.bottlesPerUnit && line.bottlesPerUnit > 1
                                  ? 'carton(s)'
                                  : 'bout.'}{' '}
                                offert
                                {Math.floor(line.quantity / promo.buyQuantity!) *
                                  promo.getFreeQuantity! >
                                1
                                  ? 's'
                                  : ''}
                                )
                              </span>
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
                          aria-label="Supprimer la ligne"
                        >
                          <CloseIcon className="w-3.5 h-3.5" />
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
            <AlertCircleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
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
        <h2 className="text-lg font-semibold text-text-primary dark:text-text-primary-dark mb-4 flex items-center gap-2">
          <TruckIcon className="w-5 h-5 text-primary" /> Livraison & Finalisation
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
            <span className="text-sm text-text-secondary dark:text-text-secondary-dark flex items-center gap-2">
              <MailIcon className="w-4 h-4 text-primary" /> Envoyer un email de confirmation de
              commande au client
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
              className="btn-primary px-8 py-3 text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-2"
            >
              {isPending ? (
                'Enregistrement en cours…'
              ) : (
                <>
                  <CheckIcon className="w-4 h-4 text-current" />
                  <span>Créer la commande</span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>
    </form>
  )
}
