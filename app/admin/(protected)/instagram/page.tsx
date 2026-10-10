import { prisma } from '@/lib/prisma'
import { getMainImageUrl } from '@/lib/cuvees-gallery'
import { InstagramGalleryClient, InstagramProduct } from '@/components/admin/InstagramGalleryClient'

export const dynamic = 'force-dynamic'

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function generateCaption(product: {
  name: string
  year: number | null
  description: string | null
  category: { name: string }
  producer: { name: string } | null
}) {
  const producerName = product.producer?.name ? ` - ${product.producer.name}` : ''
  const millesime = product.year ? ` (Millésime ${product.year})` : ''
  const note = product.description?.trim()
    ? `\n\nNotes de dégustation : ${product.description.trim()}`
    : ''

  return `🍎 ${product.name}${millesime}${producerName}

Un flacon de caractère signé par un artisan indépendant, élaboré dans le respect du fruit et du vivant.${note}

📦 Disponible sur drinkcider.ch
🇨🇭 Livraison rapide et soignée partout en Suisse.
🔞 Vente réservée aux personnes majeures (+18 ans).

#cidreartisanal #cidrenaturel #drinkcider #jacquesperritaz #cidrerieduvulcain #terroirsuisse #vinvivant #poireartisanal`
}

export default async function InstagramPage() {
  const products = await prisma.product.findMany({
    where: { active: true, archived: false },
    include: {
      category: { select: { name: true } },
      producer: { select: { name: true } },
    },
    orderBy: [{ category: { position: 'asc' } }, { name: 'asc' }],
  })

  const formatted: InstagramProduct[] = products.map((p) => {
    const hasPackshot = Boolean(getMainImageUrl(p.imageUrl, p.articleNumber))
    const slug = slugify(p.name + (p.year ? `-${p.year}` : ''))
    const caption = generateCaption(p)

    return {
      id: p.id,
      articleNumber: p.articleNumber,
      name: p.name,
      year: p.year,
      description: p.description,
      categoryName: p.category.name,
      producerName: p.producer?.name ?? null,
      hasPackshot,
      slug,
      caption,
    }
  })

  return <InstagramGalleryClient products={formatted} />
}
