import { getAllCategories } from '@/lib/strapi'

export async function GET() {
  try {
    const categories = await getAllCategories()
    return Response.json(categories)
  } catch (e) {
    console.error('Erreur catégories:', e)
    return Response.json({ error: 'Erreur lors du chargement des catégories' }, { status: 500 })
  }
}
