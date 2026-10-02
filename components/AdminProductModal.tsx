'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  createProduct,
  updateProduct,
  archiveProduct,
  createProducer,
  ProductInput,
} from '@/app/admin/(protected)/produits/actions'
import { chfInputToCents, formatCHF, proUnitPriceCents } from '@/lib/money'
import { OriginBadge } from '@/components/OriginBadge'
import { CloseIcon, LeafIcon, SproutIcon } from '@/components/admin/AdminIcons'

export type AdminProduct = {
  id: string
  name: string
  categoryId: string
  producerId: string | null
  year: number | null
  bottleSize: string
  origin: string
  description: string
  priceCents: number
  purchasePriceCents: number
  stock: number
  stockSeuil: number
  bottlesPerUnit: number
  compareAtPriceCents: number | null
  active: boolean
  isBio: boolean
  isVegan: boolean
  alcoholVolume: number | null
  imageUrl: string | null
  ordered: boolean // figure dans au moins une commande → archivage, pas de suppression
  articleNumber: number
}

const AVAILABLE_RAW_PHOTOS = [
  {
    path: '/photo-bouteilles-raw/a-propos-dailes-2021-transparent.png',
    label: "A propos d'Ailes 2021 (Détouré Transparent)",
  },
  {
    path: '/photo-bouteilles-raw/a-propos-dailes-2021-duo.jpg',
    label: "A propos d'Ailes 2021 (Duo)",
  },
  {
    path: '/photo-bouteilles-raw/a-propos-dailes-2021-face.jpg',
    label: "A propos d'Ailes 2021 (Face)",
  },
  {
    path: '/photo-bouteilles-raw/a-propos-dailes-2021-dos.jpg',
    label: "A propos d'Ailes 2021 (Dos)",
  },
  { path: '/photo-bouteilles-raw/trois-pepins-2023-duo.jpg', label: '3 Pépins 2023 (Duo)' },
  { path: '/photo-bouteilles-raw/trois-pepins-2023-face.jpg', label: '3 Pépins 2023 (Face)' },
  { path: '/photo-bouteilles-raw/trois-pepins-2023-dos.jpg', label: '3 Pépins 2023 (Dos)' },
  { path: '/photo-bouteilles-raw/trois-pepins-2010-duo.jpg', label: '3 Pépins 2010 (Duo)' },
  { path: '/photo-bouteilles-raw/quatre-pepins-2022-duo.jpg', label: '4 Pépins 2022 (Duo)' },
  { path: '/photo-bouteilles-raw/quatre-pepins-2023-duo.jpg', label: '4 Pépins 2023 (Duo)' },
  {
    path: '/photo-bouteilles-raw/poire-la-premoudiere-2022-duo.jpg',
    label: 'Poiré La Prémoudière 2022 (Duo)',
  },
  {
    path: '/photo-bouteilles-raw/poire-la-premoudiere-2022-face.jpg',
    label: 'Poiré La Prémoudière 2022 (Face)',
  },
  {
    path: '/photo-bouteilles-raw/la-fribourgeoise-2021-duo.jpg',
    label: 'La Fribourgeoise 2021 (Duo)',
  },
  {
    path: '/photo-bouteilles-raw/la-fribourgeoise-2021-face.jpg',
    label: 'La Fribourgeoise 2021 (Face)',
  },
  { path: '/photo-bouteilles-raw/cidre-de-fer-2020-duo.jpg', label: 'Cidre de Fer 2020 (Duo)' },
  { path: '/photo-bouteilles-raw/cidre-de-fer-2020-face.jpg', label: 'Cidre de Fer 2020 (Face)' },
  { path: '/photo-bouteilles-raw/belle-brutale-2017-duo.jpg', label: 'Belle Brutale 2017 (Duo)' },
  { path: '/photo-bouteilles-raw/premiers-emois-2021-duo.jpg', label: 'Premiers Émois 2021 (Duo)' },
  { path: '/photo-bouteilles-raw/brute-de-rue-2021-duo.jpg', label: 'Brute de Rue 2021 (Duo)' },
  { path: '/photo-bouteilles-raw/baie-de-rue-2023-duo.jpg', label: 'Baie de Rue 2023 (Duo)' },
  { path: '/photo-bouteilles-raw/turgowy-2019-duo.jpg', label: 'Turgowy 2019 (Duo)' },
  { path: '/photo-bouteilles-raw/turgowy-2020-duo.jpg', label: 'Turgowy 2020 (Duo)' },
  { path: '/photo-bouteilles-raw/turgowy-2023-duo.jpg', label: 'Turgowy 2023 (Duo)' },
  { path: '/photo-bouteilles-raw/lande-foy-2022-duo.jpg', label: 'Lande Foy 2022 (Duo)' },
  { path: '/photo-bouteilles-raw/cidre-glace-2012-face.jpg', label: 'Cidre Glacé 2012 (Face)' },
  {
    path: '/photo-bouteilles-raw/botsi-de-glace-2017-face.jpg',
    label: 'Botsi de Glace 2017 (Face)',
  },
]

interface AdminProductModalProps {
  product?: AdminProduct
  categories: { id: string; name: string }[]
  producers: { id: string; name: string }[]
  proRatePercent: number
  onClose: () => void
}

export default function AdminProductModal({
  product,
  categories,
  producers,
  proRatePercent,
  onClose,
}: AdminProductModalProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const [producersList, setProducersList] = useState(producers)
  const [showNewProducer, setShowNewProducer] = useState(false)
  const [newProducerName, setNewProducerName] = useState('')
  const [isCreatingProducer, setIsCreatingProducer] = useState(false)
  const [imageError, setImageError] = useState(false)

  const [form, setForm] = useState({
    name: product?.name ?? '',
    categoryId: product?.categoryId ?? categories[0]?.id ?? '',
    producerId: product?.producerId ?? producers[0]?.id ?? '',
    year: product?.year ? String(product.year) : '',
    bottleSize: (product?.bottleSize as '75cl' | '27.5cl') ?? '75cl',
    origin: (product?.origin as 'CH' | 'FR') ?? 'CH',
    priceChf: product ? String(product.priceCents / 100) : '',
    compareAtPriceChf: product?.compareAtPriceCents
      ? String(product.compareAtPriceCents / 100)
      : '',
    purchasePriceChf: product ? String(product.purchasePriceCents / 100) : '',
    // Chaînes et non nombres : un champ vide reste vide, au lieu d'afficher un
    // zéro devant lequel la saisie viendrait s'ajouter (« 01500 »).
    stock: product ? String(product.stock) : '',
    stockSeuil: product ? String(product.stockSeuil) : '5',
    bottlesPerUnit: product ? String(product.bottlesPerUnit) : '1',
    description: product?.description ?? '',
    imageUrl: product?.imageUrl ?? '',
    active: product?.active ?? true,
    isBio: product?.isBio ?? false,
    isVegan: product?.isVegan ?? false,
    alcoholVolume: product?.alcoholVolume ? String(product.alcoholVolume) : '',
  })

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleImageUrlChange = (val: string) => {
    let cleaned = val.trim()
    if (cleaned.startsWith('photo-bouteilles-raw/')) {
      cleaned = '/' + cleaned
    }
    update('imageUrl', cleaned)
    setImageError(false)
  }

  const priceCents = chfInputToCents(form.priceChf)

  const handleCreateProducer = async () => {
    if (!newProducerName.trim()) return
    setIsCreatingProducer(true)
    const res = await createProducer(newProducerName)
    setIsCreatingProducer(false)
    if (res?.ok && res.producer) {
      setProducersList((prev) =>
        [...prev, res.producer].sort((a, b) => a.name.localeCompare(b.name))
      )
      update('producerId', res.producer.id)
      setNewProducerName('')
      setShowNewProducer(false)
    } else if (res?.error) {
      setError(res.error)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const input: ProductInput = {
      name: form.name,
      categoryId: form.categoryId,
      producerId: form.producerId || null,
      year: form.year ? Number(form.year) : null,
      bottleSize: form.bottleSize,
      origin: form.origin,
      description: form.description,
      priceCents,
      compareAtPriceCents: form.compareAtPriceChf ? chfInputToCents(form.compareAtPriceChf) : null,
      purchasePriceCents: chfInputToCents(form.purchasePriceChf),
      stock: Number(form.stock),
      stockSeuil: Number(form.stockSeuil),
      bottlesPerUnit: Math.max(1, parseInt(form.bottlesPerUnit) || 1),
      active: form.active,
      isBio: form.isBio,
      isVegan: form.isVegan,
      alcoholVolume: form.alcoholVolume ? Number(form.alcoholVolume) : null,
      imageUrl: form.imageUrl,
    }
    startTransition(async () => {
      const result = product ? await updateProduct(product.id, input) : await createProduct(input)
      if (result?.error) {
        setError(result.error)
        return
      }
      router.refresh()
      onClose()
    })
  }

  const handleArchive = () => {
    startTransition(async () => {
      const result = await archiveProduct(product!.id)
      if (result?.error) {
        setError(result.error)
        return
      }
      router.refresh()
      onClose()
    })
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setError(null)
      // 1. Demander une URL présignée à notre API
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      })

      if (!res.ok) {
        throw new Error('Erreur de préparation S3 (Vérifiez votre configuration AWS)')
      }

      const { uploadUrl, fileUrl } = await res.json()

      // 2. Uploader le fichier directement sur S3
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })

      if (!uploadRes.ok) throw new Error("Erreur lors de l'envoi de l'image vers S3")

      // 3. Mettre à jour l'URL dans le formulaire
      update('imageUrl', fileUrl)
    } catch (err: any) {
      setError(err.message || "Erreur d'upload")
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-lg bg-white dark:bg-[#152535] border border-border dark:border-border-dark rounded-xl shadow-2xl overflow-y-auto max-h-[90vh] z-50">
        <div className="flex items-center justify-between p-5 border-b border-border dark:border-border-dark bg-white dark:bg-[#152535] sticky top-0 z-20">
          <h2 className="font-semibold text-text-primary dark:text-text-primary-dark">
            {product ? 'Modifier le produit' : 'Ajouter un produit'}
            {product && (
              <span className="ml-3 text-xs font-mono font-normal text-text-tertiary dark:text-text-tertiary-dark bg-bg-page/50 dark:bg-bg-page-dark/50 px-2 py-1 rounded-md">
                Article-Nr. {product.articleNumber.toString().padStart(5, '0')}
              </span>
            )}
          </h2>
          <button
            onClick={onClose}
            className="text-text-tertiary dark:text-text-tertiary-dark hover:text-text-primary dark:hover:text-text-primary-dark transition-colors p-1"
            aria-label="Fermer"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-5 flex flex-col gap-4 bg-white dark:bg-[#152535]"
        >
          {/* Nom du produit */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
              Nom du produit
            </label>
            <input
              className="input-field"
              placeholder="Cidre Brut 2024"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              required
            />
          </div>

          {/* Catégorie + Producteur */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
                Catégorie
              </label>
              <select
                className="input-field"
                value={form.categoryId}
                onChange={(e) => update('categoryId', e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
                  Producteur
                </label>
                <button
                  type="button"
                  onClick={() => setShowNewProducer(!showNewProducer)}
                  className="text-[11px] font-semibold text-primary hover:underline"
                >
                  {showNewProducer ? 'Annuler' : '+ Nouveau'}
                </button>
              </div>
              {showNewProducer ? (
                <div className="flex gap-1.5">
                  <input
                    className="input-field py-1 text-xs"
                    placeholder="Jacques Perritaz"
                    value={newProducerName}
                    onChange={(e) => setNewProducerName(e.target.value)}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleCreateProducer}
                    disabled={isCreatingProducer || !newProducerName.trim()}
                    className="rounded bg-primary px-2.5 py-1 text-xs font-medium text-text-on-primary hover:bg-primary-hover disabled:opacity-40 shrink-0"
                  >
                    {isCreatingProducer ? '...' : 'OK'}
                  </button>
                </div>
              ) : (
                <select
                  className="input-field"
                  value={form.producerId}
                  onChange={(e) => update('producerId', e.target.value)}
                >
                  <option value="">— Aucun producteur —</option>
                  {producersList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Contenance + Origine + Millésime */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
                Contenance
              </label>
              <div className="grid grid-cols-2 gap-1 h-9">
                <button
                  type="button"
                  onClick={() => update('bottleSize', '75cl')}
                  className={`rounded-md border text-xs font-semibold transition-colors ${
                    form.bottleSize === '75cl'
                      ? 'border-primary bg-primary/10 text-primary dark:bg-primary/20'
                      : 'border-border text-text-secondary hover:bg-bg-page dark:border-border-dark dark:text-text-secondary-dark dark:hover:bg-bg-page-dark'
                  }`}
                >
                  75 cl
                </button>
                <button
                  type="button"
                  onClick={() => update('bottleSize', '27.5cl')}
                  className={`rounded-md border text-xs font-semibold transition-colors ${
                    form.bottleSize === '27.5cl'
                      ? 'border-primary bg-primary/10 text-primary dark:bg-primary/20'
                      : 'border-border text-text-secondary hover:bg-bg-page dark:border-border-dark dark:text-text-secondary-dark dark:hover:bg-bg-page-dark'
                  }`}
                >
                  27.5 cl
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
                Origine
              </label>
              <div className="grid grid-cols-2 gap-1 h-9">
                <button
                  type="button"
                  onClick={() => update('origin', 'CH')}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-md border text-xs font-semibold transition-colors ${
                    form.origin === 'CH'
                      ? 'border-primary bg-primary/10 text-primary dark:bg-primary/20'
                      : 'border-border text-text-secondary hover:bg-bg-page dark:border-border-dark dark:text-text-secondary-dark dark:hover:bg-bg-page-dark'
                  }`}
                >
                  <OriginBadge origin="CH" className="w-4 h-4" />
                  <span>CH</span>
                </button>
                <button
                  type="button"
                  onClick={() => update('origin', 'FR')}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-md border text-xs font-semibold transition-colors ${
                    form.origin === 'FR'
                      ? 'border-primary bg-primary/10 text-primary dark:bg-primary/20'
                      : 'border-border text-text-secondary hover:bg-bg-page dark:border-border-dark dark:text-text-secondary-dark dark:hover:bg-bg-page-dark'
                  }`}
                >
                  <OriginBadge origin="FR" className="w-4 h-4" />
                  <span>FR</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
                Millésime
              </label>
              <input
                type="number"
                className="input-field tabular h-9"
                placeholder="2026"
                value={form.year}
                onFocus={(e) => e.target.select()}
                onChange={(e) => update('year', e.target.value)}
              />
            </div>
          </div>

          {/* Prix d'achat + Prix public + Prix d'origine barré + Prix pro dérivé */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
                Prix d&apos;achat (CHF)
              </label>
              <input
                type="number"
                step="0.05"
                min="0"
                className="input-field tabular"
                placeholder="10.00"
                value={form.purchasePriceChf}
                onFocus={(e) => e.target.select()}
                onChange={(e) => update('purchasePriceChf', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
                Prix public (CHF)
              </label>
              <input
                type="number"
                step="0.05"
                min="0"
                className="input-field tabular"
                placeholder="24.00"
                value={form.priceChf}
                onFocus={(e) => e.target.select()}
                onChange={(e) => update('priceChf', e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
                  Prix barré (CHF)
                </label>
                {form.compareAtPriceChf &&
                  Number(form.compareAtPriceChf) > Number(form.priceChf) && (
                    <span className="text-[10px] font-bold text-accent-rose-dark dark:text-accent-rose">
                      -
                      {Math.round(
                        (1 - Number(form.priceChf) / Number(form.compareAtPriceChf)) * 100
                      )}
                      %
                    </span>
                  )}
              </div>
              <input
                type="number"
                step="0.05"
                min="0"
                className="input-field tabular"
                placeholder="Ex: 28.00"
                value={form.compareAtPriceChf}
                onFocus={(e) => e.target.select()}
                onChange={(e) => update('compareAtPriceChf', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
                Prix pro (−{proRatePercent}%)
              </label>
              <input
                className="input-field tabular opacity-60"
                value={
                  priceCents > 0 ? formatCHF(proUnitPriceCents(priceCents, proRatePercent)) : '—'
                }
                disabled
              />
            </div>
          </div>

          {/* Bouteilles par unité vendue */}
          <div className="flex flex-col gap-1.5 p-3 rounded-md bg-bg-page dark:bg-bg-page-dark border border-border dark:border-border-dark">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-text-primary dark:text-text-primary-dark">
                Bouteilles par unité vendue (+1 boutique)
              </label>
              <span className="text-[11px] text-text-secondary dark:text-text-secondary-dark font-medium">
                {form.bottlesPerUnit === '1'
                  ? '1 bouteille standard'
                  : `Carton de ${form.bottlesPerUnit} bouteilles`}
              </span>
            </div>
            <p className="text-[11px] text-text-secondary dark:text-text-secondary-dark leading-normal">
              1 par défaut. Pour un carton (ex: offre estivale 24x27.5cl), indiquez le nombre de
              bouteilles incluses dans chaque unité ajoutée au panier.
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {[
                { label: '1 bout. (standard)', val: '1' },
                { label: 'Carton de 6', val: '6' },
                { label: 'Carton de 12', val: '12' },
                { label: 'Carton de 24 (estivale)', val: '24' },
              ].map((preset) => (
                <button
                  key={preset.val}
                  type="button"
                  onClick={() => update('bottlesPerUnit', preset.val)}
                  className={`px-2.5 py-1 text-xs rounded-md border font-medium transition-colors ${
                    form.bottlesPerUnit === preset.val
                      ? 'border-primary bg-primary/10 text-primary dark:bg-primary/20 font-semibold'
                      : 'border-border dark:border-border-dark text-text-secondary dark:text-text-secondary-dark hover:bg-bg-card dark:hover:bg-bg-card-dark'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-xs text-text-secondary dark:text-text-secondary-dark">
                  Personnalisé :
                </span>
                <input
                  type="number"
                  min="1"
                  className="input-field tabular w-16 h-8 text-center"
                  value={form.bottlesPerUnit}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => update('bottlesPerUnit', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Stock + Seuil d'alerte */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
                Stock (
                {form.bottlesPerUnit === '1' ? 'bouteilles' : `cartons de ${form.bottlesPerUnit}`})
              </label>
              <input
                type="number"
                min="0"
                className="input-field tabular"
                value={form.stock}
                onFocus={(e) => e.target.select()}
                onChange={(e) => update('stock', e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
                Seuil d&apos;alerte stock
              </label>
              <input
                type="number"
                min="0"
                className="input-field tabular"
                value={form.stockSeuil}
                onFocus={(e) => e.target.select()}
                onChange={(e) => update('stockSeuil', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
              Description
            </label>
            <textarea
              className="input-field resize-none"
              rows={3}
              placeholder="Description du produit..."
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
            />
          </div>

          {/* Image */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
                Image du produit
              </label>
              {form.imageUrl && (
                <button
                  type="button"
                  onClick={() => {
                    update('imageUrl', '')
                    setImageError(false)
                  }}
                  className="text-xs text-text-error hover:underline"
                >
                  Retirer l&apos;image
                </button>
              )}
            </div>

            <div className="border-2 border-dashed border-border dark:border-border-dark rounded-lg p-3 flex flex-col items-center gap-2 bg-bg-page/40 dark:bg-bg-page-dark/40 relative">
              {form.imageUrl ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="relative w-28 h-28 rounded-lg border border-border dark:border-border-dark bg-white dark:bg-[#152535] overflow-hidden flex items-center justify-center shadow-xs">
                    {!imageError ? (
                      <img
                        src={form.imageUrl}
                        alt="Aperçu"
                        onError={() => setImageError(true)}
                        onLoad={() => setImageError(false)}
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center p-2 text-text-error">
                        <span className="text-xl">⚠️</span>
                        <span className="text-[10px] font-semibold mt-1">Image introuvable</span>
                        <span className="text-[9px] text-text-tertiary">Vérifiez l&apos;URL</span>
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-text-tertiary max-w-[320px] truncate text-center">
                    {form.imageUrl}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5 text-center py-2">
                  <span className="text-2xl">📷</span>
                  <span className="text-xs text-text-secondary dark:text-text-secondary-dark font-medium">
                    Sélectionner un fichier ou choisir dans le catalogue
                  </span>
                  <span className="font-mono text-[10px] text-text-tertiary">
                    Format carré 1:1 conseillé
                  </span>
                </div>
              )}

              {/* Upload file input */}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                title="Cliquer pour uploader une image"
              />
            </div>

            {/* Sélecteur rapide des photos du catalogue local */}
            <div className="flex flex-col gap-1 mt-1">
              <select
                className="input-field text-xs py-1.5 cursor-pointer"
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    handleImageUrlChange(e.target.value)
                  }
                }}
              >
                <option value="">📁 Choisir une photo parmi le catalogue local...</option>
                {AVAILABLE_RAW_PHOTOS.map((photo) => (
                  <option key={photo.path} value={photo.path}>
                    {photo.label}
                  </option>
                ))}
              </select>

              {/* URL ou chemin exact */}
              <input
                className="input-field text-xs font-mono"
                placeholder="Ex: /photo-bouteilles-raw/trois-pepins-2023-duo.jpg ou https://…"
                value={form.imageUrl}
                onChange={(e) => handleImageUrlChange(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-1 border-t border-border dark:border-border-dark pt-3">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
                  Visible dans la boutique
                </label>
                <button
                  type="button"
                  onClick={() => update('active', !form.active)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-pill transition-colors ${
                    form.active ? 'bg-primary' : 'bg-border dark:bg-border-dark'
                  }`}
                  aria-label="Basculer la visibilité"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      form.active ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-text-primary dark:text-text-primary-dark flex items-center gap-2">
                  <span>Certifié Bio</span>
                  <LeafIcon className="w-3.5 h-3.5 text-emerald-600" />
                </label>
                <button
                  type="button"
                  onClick={() => update('isBio', !form.isBio)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-pill transition-colors ${
                    form.isBio ? 'bg-primary' : 'bg-border dark:bg-border-dark'
                  }`}
                  aria-label="Basculer bio"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      form.isBio ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-text-primary dark:text-text-primary-dark flex items-center gap-2">
                  <span>Certifié Vegan</span>
                  <SproutIcon className="w-3.5 h-3.5 text-emerald-500" />
                </label>
                <button
                  type="button"
                  onClick={() => update('isVegan', !form.isVegan)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-pill transition-colors ${
                    form.isVegan ? 'bg-primary' : 'bg-border dark:bg-border-dark'
                  }`}
                  aria-label="Basculer vegan"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      form.isVegan ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
                Volume d&apos;alcool (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                className="input-field tabular"
                placeholder="4.5"
                value={form.alcoholVolume}
                onFocus={(e) => e.target.select()}
                onChange={(e) => update('alcoholVolume', e.target.value)}
              />
              <span className="text-[10px] text-text-tertiary mt-1 leading-tight">
                Laissez vide si non applicable (ex: jus de pomme).
              </span>
            </div>
          </div>

          {error && (
            <p className="rounded-md bg-[#FDF2F2] px-3 py-2 text-sm text-[#C62828]">{error}</p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-border dark:border-border-dark">
            <div>
              {product &&
                (confirmDelete ? (
                  <span className="flex items-center gap-2 text-sm">
                    <span className="text-text-secondary dark:text-text-secondary-dark">
                      {product.ordered ? 'Archiver ce produit ?' : 'Supprimer définitivement ?'}
                    </span>
                    <button
                      type="button"
                      onClick={handleArchive}
                      disabled={pending}
                      className="btn-danger text-xs px-3 py-1.5"
                    >
                      Confirmer
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="text-xs text-text-tertiary dark:text-text-tertiary-dark hover:underline"
                    >
                      Annuler
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="text-sm text-text-error hover:underline"
                  >
                    {product.ordered ? 'Archiver' : 'Supprimer'}
                  </button>
                ))}
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={onClose} className="btn-secondary">
                Annuler
              </button>
              <button type="submit" disabled={pending} className="btn-primary disabled:opacity-50">
                {pending ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>

          {product?.ordered && (
            <p className="text-xs text-text-tertiary dark:text-text-tertiary-dark">
              Ce produit figure dans des commandes : il ne peut pas être supprimé, seulement
              archivé. Les factures passées restent intactes.
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
