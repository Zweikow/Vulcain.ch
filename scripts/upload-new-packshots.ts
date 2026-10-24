import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import fs from 'fs'
import path from 'path'

const s3 = new S3Client({ region: 'eu-central-1' })

const PACKSHOT_FILES = [
  'poire-comment-2022-duo.jpg',
  'poire-comment-2022-face.jpg',
  'poire-comment-2022-dos.jpg',
  'comment-2022-duo.jpg',
  'comment-2022-face.jpg',
  'comment-2022-dos.jpg',
  'new-poire-comment-2022-duo.jpg',
  'new-poire-comment-2022-face.jpg',
  'new-poire-comment-2022-dos.jpg',
  'brute-de-rue-2022-duo.jpg',
  'brute-de-rue-2022-face.jpg',
  'brute-de-rue-2022-dos.jpg',
]

// OpenNext Site Assets Buckets (où CloudFront route /packshots/*)
const SITE_ASSET_BUCKETS = [
  'cidrerie-vulcain-production-cidreriesiteassetsbucket-rabuoddh',
  'cidrerie-vulcain-dev-cidreriesiteassetsbucket-wbdnbxcf',
  'cidrerie-vulcain-sandbox-cidreriesiteassetsbucket-obforxvt',
]

// SST Photos Buckets
const PHOTOS_BUCKETS = [
  'cidrerie-vulcain-production-photosbucketbucket-vuamsmst',
  'cidrerie-vulcain-dev-photosbucketbucket-vxtzuexz',
  'cidrerie-vulcain-sandbox-photosbucketbucket-dhresafo',
]

async function uploadFile(bucket: string, key: string, filePath: string) {
  const fileContent = fs.readFileSync(filePath)
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: fileContent,
      ContentType: 'image/jpeg',
      CacheControl: 'public,max-age=31536000,immutable',
    })
  )
}

async function main() {
  console.log('=== Upload des packshots vers AWS S3 ===\n')
  const baseDir = path.join(process.cwd(), 'public', 'packshots')

  for (const filename of PACKSHOT_FILES) {
    const filePath = path.join(baseDir, filename)
    if (!fs.existsSync(filePath)) {
      console.error(`Fichier manquant: ${filePath}`)
      continue
    }

    const sizeKb = Math.round(fs.statSync(filePath).size / 1024)
    console.log(`\n📦 Traitement de ${filename} (${sizeKb} Ko)...`)

    // 1. Upload vers les buckets OpenNext Assets (_assets/packshots/*)
    for (const bucket of SITE_ASSET_BUCKETS) {
      const key = `_assets/packshots/${filename}`
      try {
        await uploadFile(bucket, key, filePath)
        console.log(`  ✓ ${bucket} -> ${key}`)
      } catch (err: any) {
        console.warn(`  ✗ ${bucket} -> ${key} : ${err.message}`)
      }
    }

    // 2. Upload vers les buckets SST PhotosBucket (packshots/* et racine)
    for (const bucket of PHOTOS_BUCKETS) {
      try {
        await uploadFile(bucket, `packshots/${filename}`, filePath)
        console.log(`  ✓ ${bucket} -> packshots/${filename}`)
        await uploadFile(bucket, filename, filePath)
        console.log(`  ✓ ${bucket} -> ${filename}`)
      } catch (err: any) {
        console.warn(`  ✗ ${bucket} : ${err.message}`)
      }
    }
  }

  console.log('\n=== Upload S3 terminé avec succès ! ===')
}

main().catch(console.error)
