import { getProduct } from '@/lib/strapi'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const product = await getProduct(id)
    return Response.json(product)
  } catch (e) {
    return Response.json({ error: 'Product not found' }, { status: 404 })
  }
}
