import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { timingSafeEqual } from 'crypto'
import { ImageResponse } from 'next/og'
import { PNG } from 'pngjs'
import jpeg from 'jpeg-js'
import { prisma } from '@/lib/prisma'
import { ARTICLE_SLUG_MAP, getMainImageUrl } from '@/lib/cuvees-gallery'
import { currentUser } from '@/lib/guards'

/**
 * Visuel Instagram 1080x1350 (4:5) d'une référence du catalogue, en JPEG.
 *
 * GET /api/instagram/<numéro d'article ou cuid>
 * Authentification : session admin active dans le navigateur OU x-render-secret
 *
 * Runtime Node (pas edge) : polices lues sur disque, JPEG encodé en JavaScript
 * pur (pngjs + jpeg-js), sans binaire natif à faire correspondre à la Lambda.
 */
export const dynamic = 'force-dynamic'

const WIDTH = 1080
const HEIGHT = 1350
const JPEG_QUALITY = 92
const FETCH_TIMEOUT_MS = 10_000

// Palette du site (docs/DESIGN.md)
const CANVAS = '#F7F6F0'
const DEEP = '#153243'
const BODY = '#4A6278'
const GREEN = '#80ED99'
const BORDER = '#E2E8EF'

type FontSpec = {
  name: string
  data: Buffer
  weight: 400 | 600
  style: 'normal' | 'italic'
}

// Satori n'utilise aucune police système et ne lit ni le WOFF2 ni les axes
// variables : TTF statiques versionnés dans assets/fonts (licence OFL).
const FONT_FILES: Array<Omit<FontSpec, 'data'> & { file: string }> = [
  { file: 'fraunces/Fraunces-SemiBold.ttf', name: 'Fraunces', weight: 600, style: 'normal' },
  { file: 'fraunces/Fraunces-Italic.ttf', name: 'Fraunces', weight: 400, style: 'italic' },
  {
    file: 'plus-jakarta-sans/PlusJakartaSans-Regular.ttf',
    name: 'Plus Jakarta Sans',
    weight: 400,
    style: 'normal',
  },
  {
    file: 'plus-jakarta-sans/PlusJakartaSans-SemiBold.ttf',
    name: 'Plus Jakarta Sans',
    weight: 600,
    style: 'normal',
  },
]

function getFontPath(file: string): string {
  const candidates = [
    path.join(process.cwd(), 'assets', 'fonts', file),
    path.join(__dirname, 'assets', 'fonts', file),
    path.join(__dirname, '..', '..', '..', '..', 'assets', 'fonts', file),
    path.resolve('assets', 'fonts', file),
  ]
  for (const c of candidates) {
    if (existsSync(c)) return c
  }
  return path.join(process.cwd(), 'assets', 'fonts', file)
}

let fontsPromise: Promise<FontSpec[]> | null = null

function loadFonts(): Promise<FontSpec[]> {
  fontsPromise ??= Promise.all(
    FONT_FILES.map(async ({ file, ...spec }) => ({
      ...spec,
      data: await readFile(getFontPath(file)),
    }))
  ).catch((error) => {
    fontsPromise = null // nouvel essai à la prochaine requête
    throw error
  })
  return fontsPromise
}

/** Image distante introuvable ou refusée : erreur 502, pas 500. */
class AssetError extends Error {}

/**
 * Packshots et logo sont lus en HTTP, jamais sur disque : en ligne, public/ est
 * servi par S3 et n'est pas dans la fonction serveur.
 */
function assetBase(request: Request): URL {
  const configured = process.env.INSTAGRAM_ASSET_BASE_URL?.trim()
  return new URL(configured || new URL(request.url).origin)
}

async function fetchAsDataUri(src: string, base: URL): Promise<string> {
  const url = new URL(src, base)
  // Seuls le site et le stockage S3 des photos sont acceptés
  if (url.origin !== base.origin && !url.hostname.endsWith('.amazonaws.com')) {
    throw new AssetError(`Origine d'image non autorisée : ${url.hostname}`)
  }
  const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
  if (!res.ok) throw new AssetError(`${url.pathname} : HTTP ${res.status}`)
  const type = res.headers.get('content-type')?.split(';')[0].trim() ?? ''
  if (!['image/jpeg', 'image/png', 'image/svg+xml'].includes(type)) {
    throw new AssetError(`${url.pathname} : format non pris en charge (${type || 'inconnu'})`)
  }
  return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString('base64')}`
}

async function isAuthorized(request: Request): Promise<boolean> {
  // 1. Session admin ou gestionnaire connectée dans le navigateur
  const user = await currentUser().catch(() => null)
  if (user) return true

  // 2. Secret passé par header ou paramètre d'URL (pour scripts et n8n)
  const secret = process.env.INSTAGRAM_RENDER_SECRET
  if (secret) {
    const url = new URL(request.url)
    const querySecret = url.searchParams.get('secret') ?? ''
    const headerSecret = request.headers.get('x-render-secret') ?? ''
    const token = headerSecret || querySecret

    if (token) {
      const given = Buffer.from(token)
      const wanted = Buffer.from(secret)
      if (given.length === wanted.length && timingSafeEqual(given, wanted)) {
        return true
      }
    }
  }

  return false
}

/** « Turgowy 2019 » + millésime 2019 -> « Turgowy » ; retire aussi un préfixe « NEW: ». */
function cuveeName(name: string, year: number | null): string {
  let cleaned = name.replace(/^\s*new\s*:\s*/i, '').trim()
  if (year) cleaned = cleaned.replace(new RegExp(`\\s*${year}\\s*$`), '').trim()
  return cleaned || name
}

/** Taille du nom selon sa longueur : deux lignes au plus, sans débordement. */
function nameFontSize(name: string): number {
  if (name.length <= 14) return 86
  if (name.length <= 20) return 74
  if (name.length <= 28) return 62
  return 52
}

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function json(status: number, error: string) {
  return Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthorized(request))) return json(401, 'Non autorisé')

  const { id } = await params
  const byArticle = /^\d{1,9}$/.test(id)
  if (!byArticle && !/^[a-z0-9]{20,40}$/.test(id)) return json(404, 'Produit introuvable')

  const product = await prisma.product.findUnique({
    where: byArticle ? { articleNumber: Number(id) } : { id },
    select: {
      articleNumber: true,
      name: true,
      year: true,
      description: true,
      imageUrl: true,
      active: true,
      archived: true,
      category: { select: { name: true } },
      producer: { select: { name: true } },
    },
  })
  if (!product || !product.active || product.archived) return json(404, 'Produit introuvable')

  // Même règle que la vignette boutique ; sans packshot, pas de visuel vide
  const imageUrl = getMainImageUrl(product.imageUrl, product.articleNumber)
  if (!imageUrl) return json(404, 'Aucun packshot pour ce produit')

  try {
    const base = assetBase(request)
    const [fonts, packshot, logo] = await Promise.all([
      loadFonts(),
      fetchAsDataUri(imageUrl, base),
      fetchAsDataUri('/images/logo-drinkcider.svg', base),
    ])

    const name = cuveeName(product.name, product.year)
    const note = product.description?.trim()

    const png = await new ImageResponse(
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: 'flex',
          flexDirection: 'column',
          padding: 56,
          background: CANVAS,
          color: DEEP,
          fontFamily: 'Plus Jakarta Sans',
        }}
      >
        {/* En-tête : logo, marque, catégorie */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 72,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} alt="" width={68} height={68} style={{ borderRadius: 34 }} />
            <span style={{ marginLeft: 18, fontFamily: 'Fraunces', fontWeight: 600, fontSize: 36 }}>
              Drinkcider
            </span>
          </div>
          <span
            style={{
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: 2.5,
              textTransform: 'uppercase',
              color: BODY,
            }}
          >
            {product.category.name}
          </span>
        </div>

        {/* Packshot : il prend toute la hauteur que le texte laisse libre */}
        <div
          style={{
            display: 'flex',
            flexGrow: 1,
            minHeight: 0,
            marginTop: 28,
            alignItems: 'center',
            justifyContent: 'center',
            background: '#FFFFFF',
            border: `2px solid ${BORDER}`,
            borderRadius: 36,
            overflow: 'hidden',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={packshot}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </div>

        {/* Millésime, producteur, nom, note de dégustation */}
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 34 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {product.year && (
              <span
                style={{
                  padding: '8px 18px',
                  marginRight: 16,
                  borderRadius: 999,
                  background: GREEN,
                  color: DEEP,
                  fontSize: 22,
                  fontWeight: 600,
                  letterSpacing: 1.5,
                }}
              >
                {`MILLÉSIME ${product.year}`}
              </span>
            )}
            {product.producer && (
              <span style={{ fontSize: 24, color: BODY }}>{product.producer.name}</span>
            )}
          </div>
          <div
            style={{
              display: 'block',
              marginTop: 16,
              fontFamily: 'Fraunces',
              fontWeight: 600,
              fontSize: nameFontSize(name),
              lineHeight: 1.06,
              lineClamp: 2,
            }}
          >
            {name}
          </div>
          {note && (
            <div
              style={{
                display: 'block',
                marginTop: 14,
                fontFamily: 'Fraunces',
                fontStyle: 'italic',
                fontSize: 32,
                lineHeight: 1.3,
                color: BODY,
                lineClamp: 2,
              }}
            >
              {note}
            </div>
          )}
        </div>
      </div>,
      { width: WIDTH, height: HEIGHT, fonts }
    ).arrayBuffer()

    // ImageResponse ne sort que du PNG : conversion JPEG en JavaScript pur
    const raster = PNG.sync.read(Buffer.from(png))
    const { data: jpg } = jpeg.encode(
      { data: raster.data, width: raster.width, height: raster.height },
      JPEG_QUALITY
    )
    const slug = ARTICLE_SLUG_MAP[product.articleNumber] ?? slugify(product.name)

    return new Response(new Uint8Array(jpg), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': String(jpg.length),
        'Content-Disposition': `inline; filename="${slug}.jpg"`,
        'Cache-Control': 'private, no-store',
        'X-Product-Slug': slug,
      },
    })
  } catch (error) {
    if (error instanceof AssetError) return json(502, error.message)
    console.error('Visuel Instagram impossible', { id, error })
    return json(500, 'Génération du visuel impossible')
  }
}
