import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { HEFTIG_FEATURE, matchFeaturedCuvees } from '@/lib/producers-data'
import { ProducerFeature } from '@/components/ProducerFeature'

// Produits fictifs, au format renvoyé par Prisma pour la page /producteurs.
const product = (slug: string, name: string, imageUrl: string | null = null) => ({
  slug,
  name,
  imageUrl,
})

describe('matchFeaturedCuvees', () => {
  it('lie une cuvée au produit qui porte son packshot, avant le nom', () => {
    const products = [
      product('engishofer-nom', 'Engishofer 2024'),
      product('engishofer-image', 'Cidre de Stehrenberg', '/packshots/heftig/engishofer.jpg'),
    ]
    const [engishofer] = matchFeaturedCuvees(HEFTIG_FEATURE.cuvees, products)
    expect(engishofer.product?.slug).toBe('engishofer-image')
  })

  it('retrouve le produit par son nom, sans accents ni casse', () => {
    const products = [
      product('boskoop', 'SCHONER VON BOSKOOP 2024'),
      product('cuvee', 'Cuvée Heftig 2023'),
      product('poire', 'Poiré 2024'),
    ]
    const slugs = matchFeaturedCuvees(HEFTIG_FEATURE.cuvees, products).map((m) => m.product?.slug)
    expect(slugs).toEqual([undefined, 'boskoop', 'cuvee', 'poire'])
  })

  it("n'attribue pas deux fois le même produit", () => {
    const products = [product('poire', 'Poiré 2024', '/packshots/heftig/poire.jpg')]
    const cuvees = [
      ...HEFTIG_FEATURE.cuvees,
      { name: 'Poiré', origin: 'Ailleurs', image: '/packshots/autre.jpg' },
    ]
    const matched = matchFeaturedCuvees(cuvees, products).filter((m) => m.product)
    expect(matched).toHaveLength(1)
  })

  it('garde les quatre cuvées quand aucune n’est en vente', () => {
    const matched = matchFeaturedCuvees(HEFTIG_FEATURE.cuvees, [])
    expect(matched).toHaveLength(4)
    expect(matched.every((m) => m.product === null)).toBe(true)
  })
})

describe('ProducerFeature', () => {
  const render = (products: ReturnType<typeof product>[]) =>
    renderToStaticMarkup(createElement(ProducerFeature, { feature: HEFTIG_FEATURE, products }))

  it('affiche le nom, le lieu, le lien vers la fiche et les quatre packshots', () => {
    const html = render([])
    expect(html).toContain('id="heftig"')
    expect(html).toContain('Cidrerie A. Heftig')
    expect(html).toContain('Producteur partenaire · Berne')
    expect(html).toContain('href="/producteurs/heftig"')
    for (const c of HEFTIG_FEATURE.cuvees) {
      expect(html).toContain(encodeURIComponent(c.image))
    }
  })

  it('sans cuvée en vente, ne propose ni lien boutique ni lien produit', () => {
    const html = render([])
    expect(html).not.toContain('/?q=')
    expect(html).not.toContain('/produits/')
  })

  it('avec des cuvées en vente, lie la boutique filtrée et chaque fiche produit', () => {
    const html = render([product('poire-heftig-2024', 'Poiré 2024')])
    expect(html).toContain('href="/?q=Heftig#catalogue"')
    expect(html).toContain('href="/produits/poire-heftig-2024"')
  })

  it("respecte l'écriture du site : ni tiret long ni point d'exclamation", () => {
    const html = render([product('poire', 'Poiré 2024')])
    const text = [HEFTIG_FEATURE.name, HEFTIG_FEATURE.place, ...HEFTIG_FEATURE.intro].join(' ')
    for (const s of [html, text]) {
      expect(s).not.toMatch(/[\u2013\u2014]/)
      expect(s).not.toContain('!')
    }
  })
})
