import { NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

import { Resource } from 'sst'

// Helper pour vérifier si le bucket SST PhotosBucket est réellement accessible
function getSstBucketName(): string | null {
  try {
    const res = Resource as Record<string, any>
    if (res && typeof res === 'object' && res.PhotosBucket?.name) {
      return res.PhotosBucket.name
    }
  } catch {
    // SST non présent ou hors contexte sst dev
  }
  return null
}

export async function POST(req: Request) {
  try {
    const contentTypeHeader = req.headers.get('content-type') || ''

    // Cas 1 : Envoi direct via FormData
    if (contentTypeHeader.includes('multipart/form-data')) {
      const formData = await req.formData()
      const file = formData.get('file') as File | null
      if (!file) {
        return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })
      }

      const ext = file.name.split('.').pop() || 'jpg'
      const uniqueFilename = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`
      const uploadDir = path.join(process.cwd(), 'public', 'uploads')
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true })
      }

      const buffer = Buffer.from(await file.arrayBuffer())
      fs.writeFileSync(path.join(uploadDir, uniqueFilename), buffer)

      return NextResponse.json({
        fileUrl: `/uploads/${uniqueFilename}`,
        ok: true,
      })
    }

    // Cas 2 : Demande d'URL présignée via JSON { filename, contentType }
    const { filename, contentType } = await req.json()

    if (!filename || !contentType) {
      return NextResponse.json({ error: 'Missing filename or contentType' }, { status: 400 })
    }

    const ext = filename.split('.').pop() || 'jpg'
    const uniqueFilename = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`
    const bucketName = getSstBucketName()

    // Si le bucket SST S3 est actif en prod / sst dev
    if (bucketName) {
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: uniqueFilename,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      })
      const client = new S3Client({ region: 'eu-central-1' })
      const uploadUrl = await getSignedUrl(client, command, { expiresIn: 60 })
      const fileUrl = `https://${bucketName}.s3.eu-central-1.amazonaws.com/${uniqueFilename}`

      return NextResponse.json({ uploadUrl, fileUrl })
    }

    // Mode Local Dev / Fallback : on génère une URL interne PUT vers /api/upload
    const origin = req.headers.get('origin') || req.headers.get('host') || 'localhost:3000'
    const protocol = origin.includes('localhost') ? 'http' : 'https'
    const uploadUrl = `${protocol}://${origin.replace(/^https?:\/\//, '')}/api/upload?file=${encodeURIComponent(uniqueFilename)}`
    const fileUrl = `/uploads/${uniqueFilename}`

    return NextResponse.json({
      uploadUrl,
      fileUrl,
    })
  } catch (error) {
    console.error('Erreur upload route:', error)
    return NextResponse.json(
      { error: "Erreur serveur lors de la préparation de l'upload" },
      { status: 500 }
    )
  }
}

export async function PUT(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const filename = searchParams.get('file')

    if (!filename) {
      return NextResponse.json({ error: 'Nom de fichier manquant' }, { status: 400 })
    }

    const safeFilename = path.basename(filename)
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    const arrayBuffer = await req.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    fs.writeFileSync(path.join(uploadDir, safeFilename), buffer)

    return NextResponse.json({
      ok: true,
      fileUrl: `/uploads/${safeFilename}`,
    })
  } catch (error) {
    console.error('Erreur upload local PUT:', error)
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement de l'image" },
      { status: 500 }
    )
  }
}
