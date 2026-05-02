import { createOrder } from '@/lib/strapi'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const order = await createOrder(body)
    return Response.json(order)
  } catch (e) {
    return Response.json({ error: 'Erreur lors de la création de la commande' }, { status: 500 })
  }
}
