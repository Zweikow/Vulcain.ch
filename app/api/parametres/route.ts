import { NextResponse } from 'next/server'
import { getPublicSettings } from '@/lib/settings'

// Sous-ensemble public des réglages (port, franco, jours de préparation, TVA).
// Utilisé par la boutique pour afficher une estimation — le montant qui fait
// foi est toujours recalculé par POST /api/commandes.
export async function GET() {
  const settings = await getPublicSettings()
  return NextResponse.json(settings)
}
