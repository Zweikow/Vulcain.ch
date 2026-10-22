const fs = require('fs')
const path = require('path')
const opentype = require('opentype.js')
const sharp = require('sharp')

// Load Georgia fonts from Windows
const georgiaBoldBuf = fs.readFileSync('C:/Windows/Fonts/georgiab.ttf')
const georgiaBold = opentype.parse(
  georgiaBoldBuf.buffer.slice(
    georgiaBoldBuf.byteOffset,
    georgiaBoldBuf.byteOffset + georgiaBoldBuf.byteLength
  )
)

const georgiaItalicBuf = fs.readFileSync('C:/Windows/Fonts/georgiai.ttf')
const georgiaItalic = opentype.parse(
  georgiaItalicBuf.buffer.slice(
    georgiaItalicBuf.byteOffset,
    georgiaItalicBuf.byteOffset + georgiaItalicBuf.byteLength
  )
)

const georgiaRegularBuf = fs.readFileSync('C:/Windows/Fonts/georgia.ttf')
const georgiaRegular = opentype.parse(
  georgiaRegularBuf.buffer.slice(
    georgiaRegularBuf.byteOffset,
    georgiaRegularBuf.byteOffset + georgiaRegularBuf.byteLength
  )
)

// Elements from original logo
const appleBody =
  'M400 256C365 224 318 227 285 259C252 291 244 346 259 396C278 459 331 493 400 496C469 493 522 459 541 396C556 346 548 291 515 259C482 227 435 224 400 256Z'
const appleStem = 'M384 225C390 193 402 167 425 145'
const appleLeaf =
  'M408.059 207.677C442.918 153.522 504.543 143.961 542.417 163.724C511.144 213.282 459.584 231.131 408.059 207.677Z'

function getTextPath(font, text, centerX, y, fontSize, letterSpacing = 0) {
  let totalWidth = 0
  const glyphs = font.stringToGlyphs(text)
  for (let i = 0; i < glyphs.length; i++) {
    const glyph = glyphs[i]
    totalWidth += (glyph.advanceWidth || 0) * (fontSize / font.unitsPerEm) + letterSpacing
  }
  totalWidth -= letterSpacing

  let startX = centerX - totalWidth / 2
  const pathObj = new opentype.Path()
  let currentX = startX

  for (let i = 0; i < glyphs.length; i++) {
    const glyph = glyphs[i]
    const glyphPath = glyph.getPath(currentX, y, fontSize)
    pathObj.commands.push(...glyphPath.commands)
    currentX += (glyph.advanceWidth || 0) * (fontSize / font.unitsPerEm) + letterSpacing
  }
  return { d: pathObj.toPathData(2), width: totalWidth }
}

function getCircularArcPath(
  font,
  text,
  cx,
  cy,
  radius,
  centerAngleDeg,
  fontSize,
  letterSpacing = 0
) {
  const glyphs = font.stringToGlyphs(text)
  let totalWidth = 0
  for (const g of glyphs) {
    totalWidth += (g.advanceWidth || 0) * (fontSize / font.unitsPerEm) + letterSpacing
  }
  totalWidth -= letterSpacing

  const totalAngleRad = totalWidth / radius
  const centerAngleRad = centerAngleDeg * (Math.PI / 180)
  let currentAngle = centerAngleRad - totalAngleRad / 2

  const pathObj = new opentype.Path()
  for (const glyph of glyphs) {
    const charWidth = (glyph.advanceWidth || 0) * (fontSize / font.unitsPerEm)
    const charMidAngle = currentAngle + charWidth / 2 / radius

    const charX = cx + radius * Math.cos(charMidAngle)
    const charY = cy + radius * Math.sin(charMidAngle)

    const rotation = charMidAngle - Math.PI / 2
    const cosR = Math.cos(rotation)
    const sinR = Math.sin(rotation)

    const gp = glyph.getPath(0, 0, fontSize)
    for (const cmd of gp.commands) {
      function transformPt(x, y) {
        const xOff = x - charWidth / 2
        const tx = xOff * cosR - y * sinR + charX
        const ty = xOff * sinR + y * cosR + charY
        return [parseFloat(tx.toFixed(2)), parseFloat(ty.toFixed(2))]
      }

      if (cmd.type === 'M') pathObj.moveTo(...transformPt(cmd.x, cmd.y))
      else if (cmd.type === 'L') pathObj.lineTo(...transformPt(cmd.x, cmd.y))
      else if (cmd.type === 'C')
        pathObj.bezierCurveTo(
          ...transformPt(cmd.x1, cmd.y1),
          ...transformPt(cmd.x2, cmd.y2),
          ...transformPt(cmd.x, cmd.y)
        )
      else if (cmd.type === 'Q')
        pathObj.quadraticCurveTo(
          ...transformPt(cmd.x1, cmd.y1),
          ...transformPt(cmd.x2, cmd.y2),
          ...transformPt(cmd.x, cmd.y)
        )
      else if (cmd.type === 'Z') pathObj.close()
    }
    currentAngle += (charWidth + letterSpacing) / radius
  }
  return pathObj.toPathData(2)
}

// -------------------------------------------------------------
// V1 : DRINKCIDER.CH (Majuscules Fidèles) + 2 lignes harmonieuses
// -------------------------------------------------------------
function createSvgV1() {
  const brand = getTextPath(georgiaBold, 'DRINKCIDER.CH', 400, 508, 36, 4.5)
  const line1 = getTextPath(georgiaItalic, 'Merci pour votre commande !', 400, 580, 26, 0.6)
  const line2 = getTextPath(georgiaItalic, 'et bonne dégustation', 400, 622, 24, 0.6)

  return `<svg width="800" height="800" viewBox="0 0 800 800" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Fond papier artisanal / beige crème -->
  <rect width="800" height="800" fill="#F6EAD0"/>
  
  <!-- Cercle extérieur doré (diamètre 633px, centré à 400,400) -->
  <circle cx="400" cy="400" r="316.5" stroke="#B98C44" stroke-width="7"/>

  <!-- Emblème Pomme & Feuille Drinkcider -->
  <g transform="translate(400, 272) scale(0.82) translate(-400, -320)">
    <path d="${appleBody}" fill="#133425"/>
    <path d="${appleStem}" stroke="#B98C44" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${appleLeaf}" fill="#B98C44"/>
  </g>

  <!-- Ligne de séparation dorée -->
  <line x1="290" y1="440" x2="510" y2="440" stroke="#B98C44" stroke-width="2.5" stroke-linecap="round"/>

  <!-- Marque : DRINKCIDER.CH -->
  <path d="${brand.d}" fill="#133425"/>

  <!-- Ornement doré feuille & perles -->
  <g transform="translate(400, 538)">
    <circle cx="-42" cy="0" r="1.5" fill="#B98C44"/>
    <line x1="-32" y1="0" x2="-12" y2="0" stroke="#B98C44" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M0 -5C3.5 -2 4.5 2 0 5.5C-4.5 2 -3.5 -2 0 -5Z" fill="#B98C44"/>
    <line x1="12" y1="0" x2="32" y2="0" stroke="#B98C44" stroke-width="1.5" stroke-linecap="round"/>
    <circle cx="42" cy="0" r="1.5" fill="#B98C44"/>
  </g>

  <!-- Message : Merci pour votre commande ! / et bonne dégustation -->
  <path d="${line1.d}" fill="#133425"/>
  <path d="${line2.d}" fill="#B98C44"/>
</svg>`
}

// -------------------------------------------------------------
// V2 : Drinkcider.ch (Casse Mixte Title Case)
// -------------------------------------------------------------
function createSvgV2() {
  const brand = getTextPath(georgiaBold, 'Drinkcider.ch', 400, 508, 42, 1.5)
  const line1 = getTextPath(georgiaItalic, 'Merci pour votre commande !', 400, 580, 26, 0.6)
  const line2 = getTextPath(georgiaItalic, 'et bonne dégustation', 400, 622, 24, 0.6)

  return `<svg width="800" height="800" viewBox="0 0 800 800" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="800" height="800" fill="#F6EAD0"/>
  <circle cx="400" cy="400" r="316.5" stroke="#B98C44" stroke-width="7"/>

  <!-- Emblème Pomme -->
  <g transform="translate(400, 272) scale(0.82) translate(-400, -320)">
    <path d="${appleBody}" fill="#133425"/>
    <path d="${appleStem}" stroke="#B98C44" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${appleLeaf}" fill="#B98C44"/>
  </g>

  <!-- Ligne séparatrice -->
  <line x1="290" y1="440" x2="510" y2="440" stroke="#B98C44" stroke-width="2.5" stroke-linecap="round"/>

  <!-- Marque : Drinkcider.ch -->
  <path d="${brand.d}" fill="#133425"/>

  <!-- Ornement doré -->
  <g transform="translate(400, 538)">
    <polygon points="0,-4 4,0 0,4 -4,0" fill="#B98C44"/>
    <line x1="-38" y1="0" x2="-10" y2="0" stroke="#B98C44" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="10" y1="0" x2="38" y2="0" stroke="#B98C44" stroke-width="1.5" stroke-linecap="round"/>
  </g>

  <!-- Message -->
  <path d="${line1.d}" fill="#133425"/>
  <path d="${line2.d}" fill="#B98C44"/>
</svg>`
}

// -------------------------------------------------------------
// V3 : DRINKCIDER.CH + "— Bonne dégustation —" (Signature prestige)
// -------------------------------------------------------------
function createSvgV3() {
  const brand = getTextPath(georgiaBold, 'DRINKCIDER.CH', 400, 508, 36, 4.5)
  const line1 = getTextPath(georgiaRegular, 'Merci pour votre commande !', 400, 578, 25, 0.8)
  const line2 = getTextPath(georgiaItalic, '— Bonne dégustation —', 400, 620, 23.5, 1.5)

  return `<svg width="800" height="800" viewBox="0 0 800 800" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="800" height="800" fill="#F6EAD0"/>
  <circle cx="400" cy="400" r="316.5" stroke="#B98C44" stroke-width="7"/>

  <!-- Emblème Pomme -->
  <g transform="translate(400, 272) scale(0.82) translate(-400, -320)">
    <path d="${appleBody}" fill="#133425"/>
    <path d="${appleStem}" stroke="#B98C44" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${appleLeaf}" fill="#B98C44"/>
  </g>

  <!-- Ligne séparatrice -->
  <line x1="290" y1="440" x2="510" y2="440" stroke="#B98C44" stroke-width="2.5" stroke-linecap="round"/>

  <!-- Marque : DRINKCIDER.CH -->
  <path d="${brand.d}" fill="#133425"/>

  <!-- Ornement délicat losange -->
  <g transform="translate(400, 538)">
    <polygon points="0,-4 4,0 0,4 -4,0" fill="#B98C44"/>
    <line x1="-38" y1="0" x2="-10" y2="0" stroke="#B98C44" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="10" y1="0" x2="38" y2="0" stroke="#B98C44" stroke-width="1.5" stroke-linecap="round"/>
  </g>

  <!-- Message -->
  <path d="${line1.d}" fill="#133425"/>
  <path d="${line2.d}" fill="#B98C44"/>
</svg>`
}

// -------------------------------------------------------------
// V4 : Sceau Packaging Rond avec texte courbé sur le bas de l'arc
// -------------------------------------------------------------
function createSvgV4() {
  const brand = getTextPath(georgiaBold, 'DRINKCIDER.CH', 400, 545, 37, 4.5)
  // Arc text centered at 90 deg (bottom)
  const arcText = getCircularArcPath(
    georgiaBold,
    'MERCI POUR VOTRE COMMANDE • BONNE DÉGUSTATION',
    400,
    400,
    276,
    90,
    16.5,
    3.2
  )

  return `<svg width="800" height="800" viewBox="0 0 800 800" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="800" height="800" fill="#F6EAD0"/>
  <circle cx="400" cy="400" r="316.5" stroke="#B98C44" stroke-width="7"/>
  <circle cx="400" cy="400" r="298" stroke="#B98C44" stroke-width="1.5"/>

  <!-- Emblème Pomme -->
  <g transform="translate(400, 310) scale(0.9) translate(-400, -320)">
    <path d="${appleBody}" fill="#133425"/>
    <path d="${appleStem}" stroke="#B98C44" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${appleLeaf}" fill="#B98C44"/>
  </g>

  <!-- Ligne séparatrice dorée -->
  <line x1="285" y1="480" x2="515" y2="480" stroke="#B98C44" stroke-width="2.5" stroke-linecap="round"/>

  <!-- Marque : DRINKCIDER.CH -->
  <path d="${brand.d}" fill="#133425"/>

  <!-- Texte en arc de cercle -->
  <path d="${arcText}" fill="#B98C44"/>
</svg>`
}

async function main() {
  const publicDir = 'public/images'
  const brainDir =
    'C:/Users/Hugo0/.gemini/antigravity-ide/brain/3cf15010-c104-426d-93fc-108b70bc3318'

  const v1 = createSvgV1()
  const v2 = createSvgV2()
  const v3 = createSvgV3()
  const v4 = createSvgV4()

  // Save the primary production file: public/images/logo-sticker-carton.svg
  fs.writeFileSync(path.join(publicDir, 'logo-sticker-carton.svg'), v1)
  console.log('Saved public/images/logo-sticker-carton.svg (Primary version)')

  // Also save secondary options in public/images for convenience
  fs.writeFileSync(path.join(publicDir, 'logo-sticker-carton-v2-titre.svg'), v2)
  fs.writeFileSync(path.join(publicDir, 'logo-sticker-carton-v3-signature.svg'), v3)
  fs.writeFileSync(path.join(publicDir, 'logo-sticker-carton-v4-sceau.svg'), v4)

  // Generate high-res 800x800 and 1600x1600 PNGs
  const png800_v1 = await sharp(Buffer.from(v1))
    .resize(800, 800)
    .png({ compressionLevel: 9 })
    .toBuffer()
  const png800_v2 = await sharp(Buffer.from(v2))
    .resize(800, 800)
    .png({ compressionLevel: 9 })
    .toBuffer()
  const png800_v3 = await sharp(Buffer.from(v3))
    .resize(800, 800)
    .png({ compressionLevel: 9 })
    .toBuffer()
  const png800_v4 = await sharp(Buffer.from(v4))
    .resize(800, 800)
    .png({ compressionLevel: 9 })
    .toBuffer()

  fs.writeFileSync(path.join(publicDir, 'logo-sticker-carton.png'), png800_v1)
  console.log('Saved public/images/logo-sticker-carton.png')

  // Also save in brain for visual display
  fs.writeFileSync(path.join(brainDir, 'option_v1.png'), png800_v1)
  fs.writeFileSync(path.join(brainDir, 'option_v2.png'), png800_v2)
  fs.writeFileSync(path.join(brainDir, 'option_v3.png'), png800_v3)
  fs.writeFileSync(path.join(brainDir, 'option_v4.png'), png800_v4)

  console.log('Finished generating all files and renders!')
}

main().catch(console.error)
