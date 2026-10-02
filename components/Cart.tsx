'use client'

import { CartItem } from '@/types'
import { formatCHF } from '@/lib/money'
import { PublicSettings } from '@/lib/settings'
import {
  ShoppingBag,
  Truck,
  CheckCircle2,
  Trash2,
  Plus,
  Minus,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'

interface CartProps {
  items: CartItem[]
  settings: PublicSettings
  onCheckout?: () => void
  onUpdateQuantity?: (productId: string, quantity: number) => void
  onRemoveItem?: (productId: string) => void
}

export default function Cart({
  items,
  settings,
  onCheckout,
  onUpdateQuantity,
  onRemoveItem,
}: CartProps) {
  const hasItems = items.length > 0
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)
  const grossSubtotalCents = items.reduce(
    (sum, item) => sum + item.product.priceCents * item.quantity,
    0
  )

  // Calcul dynamique des remises promotionnelles selon activePromotion
  const promoDiscounts: { name: string; discountCents: number }[] = []

  for (const item of items) {
    const promo = item.product.activePromotion
    if (!promo) continue

    const isCarton = (item.product.bottlesPerUnit ?? 1) > 1

    if (promo.type === 'BUY_X_GET_Y_FREE' && promo.buyQuantity && promo.getFreeQuantity) {
      if (item.quantity >= promo.buyQuantity) {
        const sets = Math.floor(item.quantity / promo.buyQuantity)
        const freeUnits = sets * promo.getFreeQuantity
        const discount = freeUnits * item.product.priceCents
        promoDiscounts.push({
          name: `${promo.name} (${freeUnits} ${isCarton ? 'carton(s)' : 'bouteille(s)'} offert${freeUnits > 1 ? 's' : ''})`,
          discountCents: discount,
        })
      }
    } else if (promo.type === 'PERCENTAGE' && promo.discountPercent) {
      const discount = Math.round(
        item.quantity * item.product.priceCents * (promo.discountPercent / 100)
      )
      promoDiscounts.push({
        name: `${promo.name} (−${promo.discountPercent}%)`,
        discountCents: discount,
      })
    } else if (promo.type === 'FIXED_DISCOUNT' && promo.discountCents) {
      const discount = item.quantity * promo.discountCents
      promoDiscounts.push({
        name: promo.name,
        discountCents: discount,
      })
    }
  }

  const promoDiscountCents = promoDiscounts.reduce((sum, d) => sum + d.discountCents, 0)
  const subtotalCents = Math.max(0, grossSubtotalCents - promoDiscountCents)

  const isFreeShipping = hasItems && subtotalCents >= settings.francoCents
  const shippingCents = hasItems && !isFreeShipping ? settings.shippingCents : 0
  const totalCents = subtotalCents + shippingCents
  const missingForFranco = Math.max(0, settings.francoCents - subtotalCents)
  const shippingProgress = Math.min(100, Math.round((subtotalCents / settings.francoCents) * 100))

  return (
    <Card className="border border-border/80 bg-card shadow-sm hover:shadow-md transition-shadow">
      {/* En-tête du Panier */}
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-foreground">
                Votre commande
              </CardTitle>
              <p className="text-xs text-muted-foreground">Expédition directe depuis la cave</p>
            </div>
          </div>
          {hasItems && (
            <Badge variant="default" className="font-mono text-xs bg-primary text-text-on-primary">
              {totalQuantity} {totalQuantity > 1 ? 'articles' : 'article'}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-4 flex flex-col gap-4">
        {/* Jauge de livraison offerte (Franco de port Suisse) */}
        {hasItems && (
          <div className="rounded-xl p-3 bg-secondary/50 border border-border/60 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <Truck className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Livraison en Suisse</span>
              </div>
              <span className="font-semibold text-primary tabular">
                {isFreeShipping ? 'Offerte !' : `Encore ${formatCHF(missingForFranco)}`}
              </span>
            </div>

            <Progress value={shippingProgress} className="h-1.5" />

            <p className="text-[11px] text-muted-foreground leading-snug">
              {isFreeShipping ? (
                <span className="text-emerald-700 dark:text-emerald-400 font-medium inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  Livraison offerte dès {formatCHF(settings.francoCents)} d&apos;achat !
                </span>
              ) : (
                `Ajoutez ${formatCHF(missingForFranco)} pour profiter des frais de port offerts.`
              )}
            </p>
          </div>
        )}

        {/* Liste des articles ou état vide */}
        {!hasItems ? (
          <div className="py-8 text-center flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-foreground">Votre panier est vide</p>
            <p className="text-xs text-muted-foreground max-w-[200px]">
              Sélectionnez des cuvées dans le catalogue pour composer votre commande.
            </p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border/40">
            {items.map((item) => {
              const isCarton = (item.product.bottlesPerUnit ?? 1) > 1
              const itemTotal = item.product.priceCents * item.quantity

              return (
                <div
                  key={item.product.id}
                  className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-sm"
                >
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-medium text-foreground truncate leading-tight">
                      {item.product.name}
                    </span>
                    <span className="text-xs text-muted-foreground mt-0.5 font-mono">
                      {isCarton
                        ? `${item.quantity} carton${item.quantity > 1 ? 's' : ''} (${item.quantity * item.product.bottlesPerUnit} bout.)`
                        : `${item.quantity} bouteille${item.quantity > 1 ? 's' : ''}`}
                    </span>
                  </div>

                  {/* Contrôleur interactif ou affichage de prix */}
                  <div className="flex items-center gap-2 shrink-0">
                    {onUpdateQuantity && onRemoveItem && (
                      <div className="flex items-center border border-border rounded-lg bg-card overflow-hidden h-7">
                        <button
                          type="button"
                          onClick={() => {
                            if (item.quantity === 1) {
                              onRemoveItem(item.product.id)
                            } else {
                              onUpdateQuantity(item.product.id, item.quantity - 1)
                            }
                          }}
                          className="w-6 h-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          aria-label="Diminuer"
                        >
                          {item.quantity === 1 ? (
                            <Trash2 className="w-3 h-3 text-destructive" />
                          ) : (
                            <Minus className="w-3 h-3" />
                          )}
                        </button>
                        <span className="px-2 text-xs font-semibold tabular select-none min-w-[20px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateQuantity(
                              item.product.id,
                              Math.min(item.quantity + 1, item.product.stock)
                            )
                          }
                          disabled={item.quantity >= item.product.stock}
                          className="w-6 h-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 transition-colors"
                          aria-label="Augmenter"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    <span className="font-semibold text-foreground tabular min-w-[70px] text-right">
                      {formatCHF(itemTotal)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Détail financier */}
        {hasItems && (
          <div className="pt-2 border-t border-border/60 flex flex-col gap-2">
            {promoDiscounts.map((d, idx) => (
              <div
                key={idx}
                className="flex justify-between items-center text-xs text-emerald-700 dark:text-emerald-400 font-medium bg-emerald-500/10 px-2 py-1.5 rounded-lg"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{d.name}</span>
                </span>
                <span className="tabular font-semibold shrink-0">
                  −{formatCHF(d.discountCents)}
                </span>
              </div>
            ))}

            <div className="flex justify-between text-xs text-muted-foreground pt-1">
              <span>Sous-total articles</span>
              <span className="tabular font-medium text-foreground">
                {formatCHF(subtotalCents)}
              </span>
            </div>

            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span>Frais de port</span>
                <span className="text-[10px] text-muted-foreground/80">(Planzer Vin)</span>
              </span>
              <span className="tabular font-medium">
                {shippingCents === 0 ? (
                  <Badge variant="success" className="text-[10px] py-0 px-1.5">
                    Offerts
                  </Badge>
                ) : (
                  formatCHF(shippingCents)
                )}
              </span>
            </div>

            <Separator className="my-1" />

            <div className="flex justify-between items-baseline text-base font-bold text-foreground">
              <div>
                <span>Total TTC</span>
                <span className="block text-[10px] font-normal text-muted-foreground">
                  TVA suisse incluse
                </span>
              </div>
              <span className="text-lg font-bold text-primary font-mono tabular">
                {formatCHF(totalCents)}
              </span>
            </div>
          </div>
        )}
      </CardContent>

      {/* Bouton d'action & réassurance */}
      {hasItems && (
        <CardFooter className="pt-0 flex flex-col gap-2.5">
          <Button
            asChild
            variant="default"
            size="lg"
            className="w-full text-sm font-semibold shadow-sm hover:shadow transition-all"
            onClick={onCheckout}
          >
            <a href="#commande">Finaliser ma commande ({formatCHF(totalCents)})</a>
          </Button>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>Facture QR-bill suisse &amp; emballage anti-casse</span>
          </div>
        </CardFooter>
      )}
    </Card>
  )
}
