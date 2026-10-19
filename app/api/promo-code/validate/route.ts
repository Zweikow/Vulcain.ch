import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { findAndValidateDiscountCode } from '@/lib/discount-codes'

const validateSchema = z.object({
  code: z.string().trim().min(1, 'Code promo requis').max(50),
  subtotalCents: z.number().int().min(0),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const parsed = validateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ valid: false, error: 'Code ou panier invalide' }, { status: 400 })
    }

    const result = await findAndValidateDiscountCode(parsed.data.code, parsed.data.subtotalCents)

    if (!result.valid) {
      return NextResponse.json({
        valid: false,
        error: result.error,
      })
    }

    return NextResponse.json({
      valid: true,
      code: result.discountCode.code,
      type: result.discountCode.type,
      percentage: result.discountCode.percentage,
      amountCents: result.discountCode.amountCents,
      discountCents: result.discountCents,
      description: result.discountCode.description,
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('POST /api/promo-code/validate error:', error)
    return NextResponse.json(
      { valid: false, error: 'Erreur lors de la vérification du code promo' },
      { status: 500 }
    )
  }
}
