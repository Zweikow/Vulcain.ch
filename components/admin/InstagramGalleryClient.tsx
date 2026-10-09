'use client'

import { useState } from 'react'
import { Download, Copy, Check, ExternalLink, Image as ImageIcon, Sparkles } from 'lucide-react'

export interface InstagramProduct {
  id: string
  articleNumber: number
  name: string
  year: number | null
  description: string | null
  categoryName: string
  producerName: string | null
  hasPackshot: boolean
  slug: string
  caption: string
}

export function InstagramGalleryClient({ products }: { products: InstagramProduct[] }) {
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [filter, setFilter] = useState<'with_packshot' | 'all'>('with_packshot')

  const displayed = products.filter((p) => (filter === 'with_packshot' ? p.hasPackshot : true))
  const withPackshotCount = products.filter((p) => p.hasPackshot).length

  const handleCopyCaption = (p: InstagramProduct) => {
    navigator.clipboard.writeText(p.caption)
    setCopiedId(p.articleNumber)
    setTimeout(() => {
      setCopiedId((curr) => (curr === p.articleNumber ? null : curr))
    }, 2500)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-semibold text-[26px] text-text-primary dark:text-text-primary-dark flex items-center gap-2">
            <span>Posts Instagram</span>
            <span className="text-xs font-mono font-medium px-2.5 py-0.5 rounded-full bg-primary/10 text-primary-text dark:bg-primary/20">
              Format 1080×1350 (4:5)
            </span>
          </h1>
          <p className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">
            Prévisualisez les visuels automatiques, téléchargez-les en JPEG HD et copiez les
            légendes avec hashtags.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('with_packshot')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === 'with_packshot'
                ? 'bg-primary text-text-on-primary'
                : 'bg-bg-page dark:bg-bg-page-dark text-text-secondary hover:text-text-primary'
            }`}
          >
            Prêts à publier ({withPackshotCount})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === 'all'
                ? 'bg-primary text-text-on-primary'
                : 'bg-bg-page dark:bg-bg-page-dark text-text-secondary hover:text-text-primary'
            }`}
          >
            Tous ({products.length})
          </button>
        </div>
      </div>

      <div className="bg-[#153243]/5 dark:bg-[#153243]/20 border border-[#153243]/10 dark:border-white/10 rounded-xl p-4 text-xs text-text-secondary dark:text-text-secondary-dark flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-primary-text shrink-0" />
          <span>
            <strong>{withPackshotCount} visuels haute définition</strong> sont déjà générés et
            exportés dans le dossier local{' '}
            <code className="font-mono bg-white dark:bg-black/30 px-1.5 py-0.5 rounded border border-black/5 dark:border-white/10">
              exports/instagram/
            </code>
          </span>
        </div>
        <div className="text-[11px] font-mono text-text-tertiary">
          Script de réexport :{' '}
          <code className="text-text-primary dark:text-text-primary-dark">
            npx tsx scripts/export-instagram.ts
          </code>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {displayed.map((p) => {
          const isCopied = copiedId === p.articleNumber
          const imageUrl = `/api/instagram/${p.articleNumber}`

          return (
            <div
              key={p.id}
              className="card overflow-hidden flex flex-col group hover:shadow-lg transition-all border border-border dark:border-border-dark"
            >
              {/* Image preview 4:5 */}
              <div className="relative aspect-[4/5] bg-[#F7F6F0] overflow-hidden flex items-center justify-center">
                {p.hasPackshot ? (
                  <>
                    <img
                      src={imageUrl}
                      alt={p.name}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                    <a
                      href={imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute top-2.5 right-2.5 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs"
                      title="Ouvrir le JPEG en pleine résolution"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </>
                ) : (
                  <div className="p-6 text-center text-text-tertiary flex flex-col items-center">
                    <ImageIcon className="w-10 h-10 opacity-30 mb-2" />
                    <span className="text-xs font-medium">Packshot manquant</span>
                    <span className="text-[10px] mt-1 opacity-70">
                      Ajoutez une photo dans Produits pour activer le visuel
                    </span>
                  </div>
                )}
              </div>

              {/* Contenu et actions */}
              <div className="p-4 flex flex-col flex-1 justify-between gap-3">
                <div>
                  <div className="flex items-center justify-between text-xs text-text-tertiary mb-1">
                    <span>Art. {p.articleNumber}</span>
                    <span className="font-medium text-text-secondary dark:text-text-secondary-dark">
                      {p.categoryName}
                    </span>
                  </div>
                  <h3 className="font-display font-semibold text-base text-text-primary dark:text-text-primary-dark line-clamp-1">
                    {p.name}
                  </h3>
                  <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-0.5">
                    {p.producerName ? `${p.producerName} · ` : ''}
                    {p.year ? `Millésime ${p.year}` : 'Non millésimé'}
                  </p>

                  {p.description && (
                    <p className="text-[11px] text-text-tertiary dark:text-text-tertiary-dark mt-2 line-clamp-2 italic">
                      « {p.description} »
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-border dark:border-border-dark flex items-center gap-2">
                  <button
                    onClick={() => handleCopyCaption(p)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      isCopied
                        ? 'bg-green-600 text-white'
                        : 'bg-primary text-text-on-primary hover:bg-primary-hover active:scale-[0.98]'
                    }`}
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Légende copiée !</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copier légende</span>
                      </>
                    )}
                  </button>

                  {p.hasPackshot && (
                    <a
                      href={imageUrl}
                      download={`drinkcider-${p.slug}.jpg`}
                      className="p-2 rounded-xl border border-border dark:border-border-dark text-text-secondary hover:text-text-primary dark:hover:text-text-primary-dark hover:bg-bg-page dark:hover:bg-bg-page-dark transition-colors"
                      title="Télécharger l'image JPEG (1080×1350)"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
