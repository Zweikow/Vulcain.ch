const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

async function createIco(pngBuffers) {
  const count = pngBuffers.length
  const headerSize = 6
  const entrySize = 16
  let offset = headerSize + count * entrySize

  const header = Buffer.alloc(headerSize)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // 1 = ICO
  header.writeUInt16LE(count, 4) // count

  const entries = []
  for (const item of pngBuffers) {
    const entry = Buffer.alloc(entrySize)
    entry.writeUInt8(item.width >= 256 ? 0 : item.width, 0)
    entry.writeUInt8(item.height >= 256 ? 0 : item.height, 1)
    entry.writeUInt8(0, 2) // palette
    entry.writeUInt8(0, 3) // reserved
    entry.writeUInt16LE(0, 4) // planes
    entry.writeUInt16LE(32, 6) // bpp
    entry.writeUInt32LE(item.buffer.length, 8) // size
    entry.writeUInt32LE(offset, 12) // offset
    entries.push(entry)
    offset += item.buffer.length
  }

  return Buffer.concat([header, ...entries, ...pngBuffers.map((p) => p.buffer)])
}

async function main() {
  const svgPath = path.resolve('public/images/logo-drinkcider.svg')
  const svgBuffer = fs.readFileSync(svgPath)

  // 1. Generate 800x800 PNGs
  const png800 = await sharp(svgBuffer).resize(800, 800).png({ compressionLevel: 9 }).toBuffer()

  fs.writeFileSync('public/images/logo-drinkcider.png', png800)
  console.log('Updated public/images/logo-drinkcider.png (800x800)')

  fs.writeFileSync('public/facture/logo-drinkcider.png', png800)
  console.log('Updated public/facture/logo-drinkcider.png (800x800)')

  // 2. Generate 1080x1080 Instagram Avatar PNG
  const png1080 = await sharp(svgBuffer).resize(1080, 1080).png({ compressionLevel: 9 }).toBuffer()

  fs.writeFileSync('public/images/instagram-avatar-drinkcider.png', png1080)
  console.log('Updated public/images/instagram-avatar-drinkcider.png (1080x1080)')

  // 3. Generate app/icon.png (192x192)
  const icon192 = await sharp(svgBuffer).resize(192, 192).png({ compressionLevel: 9 }).toBuffer()

  fs.writeFileSync('app/icon.png', icon192)
  console.log('Updated app/icon.png (192x192)')

  // 4. Generate app/apple-icon.png (180x180)
  const apple180 = await sharp(svgBuffer).resize(180, 180).png({ compressionLevel: 9 }).toBuffer()

  fs.writeFileSync('app/apple-icon.png', apple180)
  console.log('Updated app/apple-icon.png (180x180)')

  // 5. Generate Favicon ICO (16, 32, 48, 64)
  const icoSizes = [16, 32, 48, 64]
  const icoBuffers = []
  for (const s of icoSizes) {
    const buf = await sharp(svgBuffer).resize(s, s).png({ compressionLevel: 9 }).toBuffer()
    icoBuffers.push({ width: s, height: s, buffer: buf })
  }
  const icoFile = await createIco(icoBuffers)

  fs.writeFileSync('app/favicon.ico', icoFile)
  console.log('Updated app/favicon.ico')

  fs.writeFileSync('public/favicon.ico', icoFile)
  console.log('Updated public/favicon.ico')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
