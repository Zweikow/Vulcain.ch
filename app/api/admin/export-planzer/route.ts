import { NextRequest, NextResponse } from 'next/server'
import { OrderStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { currentUser } from '@/lib/guards'
import { generatePlanzerCsv, getDefaultPlanzerDates } from '@/lib/planzer'

export async function POST(request: NextRequest) {
  const user = await currentUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const orderIds: string[] = Array.isArray(body.orderIds) ? body.orderIds : []
    const pickupDate: string | undefined = body.pickupDate
    const markAsPreparing: boolean = Boolean(body.markAsPreparing)

    if (orderIds.length === 0) {
      return NextResponse.json(
        { error: 'Veuillez sélectionner au moins une commande à exporter.' },
        { status: 400 }
      )
    }

    const orders = await prisma.order.findMany({
      where: { id: { in: orderIds } },
      include: {
        items: {
          include: {
            product: { select: { bottleSize: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    if (orders.length === 0) {
      return NextResponse.json({ error: 'Aucune commande trouvée.' }, { status: 404 })
    }

    // Commandes éligibles à l'expédition (non retrait en cave)
    const shippableOrders = orders.filter((o) => !o.isPickup)
    if (shippableOrders.length === 0) {
      return NextResponse.json(
        {
          error:
            'Toutes les commandes sélectionnées sont des retraits à la cave et ne peuvent pas être expédiées via Planzer.',
        },
        { status: 400 }
      )
    }

    const pickup = pickupDate ? new Date(pickupDate) : getDefaultPlanzerDates().pickupDate

    const csvContent = generatePlanzerCsv(
      shippableOrders.map((o) => ({
        id: o.id,
        numero: o.numero,
        clientName: o.clientName,
        clientEmail: o.clientEmail,
        clientPhone: o.clientPhone,
        clientType: o.clientType,
        address: o.address,
        npa: o.npa,
        city: o.city,
        deliveryDate: o.deliveryDate,
        message: o.message,
        isPickup: o.isPickup,
        items: o.items.map((item) => ({
          productName: item.productName,
          quantity: item.quantity,
          bottlesPerUnit: item.bottlesPerUnit,
          bottleSize: item.product?.bottleSize ?? null,
        })),
      })),
      { pickupDate: pickup }
    )

    // Si demandé, mettre à jour le statut et le transporteur
    if (markAsPreparing) {
      const shippableIds = shippableOrders.map((o) => o.id)

      // Passer A_TRAITER en EN_PREPARATION
      await prisma.order.updateMany({
        where: {
          id: { in: shippableIds },
          status: OrderStatus.A_TRAITER,
        },
        data: {
          status: OrderStatus.EN_PREPARATION,
          carrier: 'Planzer',
        },
      })

      // Définir carrier Planzer pour les commandes déjà en préparation sans transporteur
      await prisma.order.updateMany({
        where: {
          id: { in: shippableIds },
          carrier: null,
        },
        data: {
          carrier: 'Planzer',
        },
      })
    }

    const dateSlug = pickup.toISOString().split('T')[0]
    const filename = `planzer_commandes_${dateSlug}.csv`

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: any) {
    console.error('Erreur export Planzer:', error)
    return NextResponse.json(
      { error: error.message || "Erreur interne lors de l'export Planzer." },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const user = await currentUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const id = searchParams.get('orderId')
  const idsParam = searchParams.get('orderIds')
  const pickupDateParam = searchParams.get('pickupDate')
  const markAsPreparing = searchParams.get('markAsPreparing') === 'true'

  const orderIds: string[] = []
  if (id) orderIds.push(id)
  if (idsParam) {
    idsParam
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((s) => {
        if (!orderIds.includes(s)) orderIds.push(s)
      })
  }

  if (orderIds.length === 0) {
    return NextResponse.json(
      { error: 'Veuillez spécifier au moins un identifiant de commande.' },
      { status: 400 }
    )
  }

  const orders = await prisma.order.findMany({
    where: { id: { in: orderIds } },
    include: {
      items: {
        include: {
          product: { select: { bottleSize: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  if (orders.length === 0) {
    return NextResponse.json({ error: 'Commande introuvable.' }, { status: 404 })
  }

  const shippableOrders = orders.filter((o) => !o.isPickup)
  if (shippableOrders.length === 0) {
    return NextResponse.json(
      {
        error:
          'Toutes les commandes sélectionnées sont des retraits à la cave et ne peuvent pas être expédiées via Planzer.',
      },
      { status: 400 }
    )
  }

  const pickup = pickupDateParam ? new Date(pickupDateParam) : getDefaultPlanzerDates().pickupDate

  const csvContent = generatePlanzerCsv(
    shippableOrders.map((o) => ({
      id: o.id,
      numero: o.numero,
      clientName: o.clientName,
      clientEmail: o.clientEmail,
      clientPhone: o.clientPhone,
      clientType: o.clientType,
      address: o.address,
      npa: o.npa,
      city: o.city,
      deliveryDate: o.deliveryDate,
      message: o.message,
      isPickup: o.isPickup,
      items: o.items.map((item) => ({
        productName: item.productName,
        quantity: item.quantity,
        bottlesPerUnit: item.bottlesPerUnit,
        bottleSize: item.product?.bottleSize ?? null,
      })),
    })),
    { pickupDate: pickup }
  )

  if (markAsPreparing) {
    const shippableIds = shippableOrders.map((o) => o.id)
    await prisma.order.updateMany({
      where: {
        id: { in: shippableIds },
        status: OrderStatus.A_TRAITER,
      },
      data: {
        status: OrderStatus.EN_PREPARATION,
        carrier: 'Planzer',
      },
    })
    await prisma.order.updateMany({
      where: {
        id: { in: shippableIds },
        carrier: null,
      },
      data: {
        carrier: 'Planzer',
      },
    })
  }

  const dateSlug = pickup.toISOString().split('T')[0]
  const filename =
    orders.length === 1
      ? `planzer_${orders[0].numero}_${dateSlug}.csv`
      : `planzer_commandes_${dateSlug}.csv`

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
