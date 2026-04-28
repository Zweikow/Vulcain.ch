import { getAllProducts } from '@/lib/strapi'

export async function GET() {
  try {
    const products = await getAllProducts()
    return Response.json(products)
  } catch (e) {
    return Response.json({ error: 'Erreur lors du chargement des produits' }, { status: 500 })
  }
}
