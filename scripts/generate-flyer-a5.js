const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fiche Dégustation A5 - Congrès Anniversaire | Drinkcider & Cidrerie du Vulcain</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,400;1,9..144,600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  
  <style>
    @page {
      size: 148mm 210mm;
      margin: 0;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      background: #E5E1D8;
      font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
      color: #133425;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px 0;
      min-height: 100vh;
    }

    /* Barre d'outils écran (non imprimée) */
    .toolbar {
      background: #133425;
      color: #F6EAD0;
      padding: 12px 24px;
      border-radius: 50px;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
      z-index: 100;
    }

    .toolbar h2 {
      font-family: 'Fraunces', serif;
      font-size: 14px;
      font-weight: 600;
      color: #F6EAD0;
    }

    .btn {
      background: #B98C44;
      color: #FFFFFF;
      border: none;
      padding: 8px 18px;
      border-radius: 30px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
      text-decoration: none;
    }

    .btn:hover {
      background: #D4A355;
      transform: translateY(-1px);
    }

    .btn-secondary {
      background: rgba(255,255,255,0.15);
      color: #F6EAD0;
    }
    .btn-secondary:hover {
      background: rgba(255,255,255,0.25);
    }

    /* Feuille A5 Physique (148 x 210 mm) */
    .a5-page {
      width: 148mm;
      height: 210mm;
      background: #F9F6F0;
      position: relative;
      overflow: hidden;
      box-shadow: 0 15px 40px rgba(0,0,0,0.15);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      page-break-after: always;
      break-after: page;
    }

    /* Cadre de luxe doré */
    .outer-border {
      position: absolute;
      top: 5mm;
      left: 5mm;
      right: 5mm;
      bottom: 5mm;
      border: 1.5pt solid #B98C44;
      pointer-events: none;
    }

    .inner-border {
      position: absolute;
      top: 6.5mm;
      left: 6.5mm;
      right: 6.5mm;
      bottom: 6.5mm;
      border: 0.5pt solid rgba(185, 140, 68, 0.4);
      pointer-events: none;
    }

    .corner {
      position: absolute;
      width: 4.5mm;
      height: 4.5mm;
      border-color: #B98C44;
      border-style: solid;
      pointer-events: none;
    }
    .corner-tl { top: 4mm; left: 4mm; border-width: 2pt 0 0 2pt; }
    .corner-tr { top: 4mm; right: 4mm; border-width: 2pt 2pt 0 0; }
    .corner-bl { bottom: 4mm; left: 4mm; border-width: 0 0 2pt 2pt; }
    .corner-br { bottom: 4mm; right: 4mm; border-width: 0 2pt 2pt 0; }

    /* Zone de contenu A5 */
    .page-content {
      position: relative;
      z-index: 2;
      padding: 8.5mm 9.5mm 8mm 9.5mm;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    /* En-tête */
    .header {
      text-align: center;
      margin-bottom: 1mm;
    }

    .logo-container {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 10px;
      margin-bottom: 1.5mm;
    }

    .logo-emblem {
      width: 28px;
      height: 28px;
    }

    .brand-group {
      text-align: left;
    }

    .brand-sup {
      font-size: 6.2pt;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #B98C44;
      line-height: 1;
    }

    .brand-main {
      font-family: 'Fraunces', serif;
      font-size: 13.5pt;
      font-weight: 700;
      color: #133425;
      letter-spacing: 0.3px;
      line-height: 1.1;
    }

    .event-badge {
      display: inline-block;
      margin-top: 1mm;
      padding: 1.2mm 4mm;
      background: #133425;
      color: #F6EAD0;
      border-radius: 999px;
      font-size: 6.8pt;
      font-weight: 600;
      letter-spacing: 0.4px;
    }

    .gold-line {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      margin: 1.8mm auto 2mm auto;
    }
    .gold-line-bar {
      width: 24mm;
      height: 0.75pt;
      background: #B98C44;
    }
    .gold-diamond {
      width: 3.5px;
      height: 3.5px;
      background: #B98C44;
      transform: rotate(45deg);
    }

    /* Section 1 : Histoire & Domaine */
    .section-box {
      background: #FFFFFF;
      border: 0.75pt solid #E3D9C3;
      border-radius: 4px;
      padding: 2.8mm 3.2mm;
      margin-bottom: 2.2mm;
      box-shadow: 0 1px 3px rgba(19, 52, 37, 0.03);
    }

    .section-title {
      font-family: 'Fraunces', serif;
      font-size: 8.8pt;
      font-weight: 700;
      color: #133425;
      display: flex;
      align-items: center;
      gap: 5px;
      margin-bottom: 1.2mm;
      letter-spacing: 0.2px;
    }

    .section-title .bullet {
      color: #B98C44;
      font-size: 10pt;
    }

    .story-body {
      font-size: 6.9pt;
      line-height: 1.4;
      color: #2D4235;
      text-align: justify;
    }

    .story-body strong {
      color: #133425;
      font-weight: 600;
    }

    /* Piliers / Spécificités (3 colonnes) */
    .pillars-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 2mm;
      margin-bottom: 2.2mm;
    }

    .pillar-card {
      background: rgba(246, 234, 208, 0.55);
      border: 0.5pt solid #DFD2B7;
      border-radius: 4px;
      padding: 2mm 2.2mm;
      text-align: center;
    }

    .pillar-icon {
      font-size: 9pt;
      display: block;
      margin-bottom: 0.8mm;
    }

    .pillar-head {
      font-size: 6.5pt;
      font-weight: 700;
      color: #133425;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-bottom: 0.5mm;
    }

    .pillar-txt {
      font-size: 6pt;
      line-height: 1.25;
      color: #44594C;
    }

    /* Section Deux Cuvées (2 colonnes) */
    .cuvees-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2.5mm;
      margin-bottom: 2.2mm;
    }

    .cuvee-card {
      background: #FFFFFF;
      border: 1pt solid #D9CBAC;
      border-radius: 4px;
      padding: 3mm 3.2mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      box-shadow: 0 1px 4px rgba(19, 52, 37, 0.04);
    }

    .cuvee-card.special {
      border-color: #B98C44;
      background: #FCFBF7;
    }

    .badge-tag {
      position: absolute;
      top: -2.2mm;
      right: 2.5mm;
      background: #133425;
      color: #F6EAD0;
      font-size: 5.2pt;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      padding: 0.6mm 2mm;
      border-radius: 2px;
    }

    .cuvee-card.special .badge-tag {
      background: #B98C44;
      color: #FFFFFF;
    }

    .cuvee-title {
      font-family: 'Fraunces', serif;
      font-size: 10.5pt;
      font-weight: 700;
      color: #133425;
      line-height: 1.1;
      margin-bottom: 0.3mm;
    }

    .cuvee-sub {
      font-size: 6.2pt;
      font-weight: 600;
      color: #B98C44;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      margin-bottom: 1.2mm;
    }

    .cuvee-desc {
      font-size: 6.6pt;
      line-height: 1.35;
      color: #31473A;
      margin-bottom: 1.5mm;
    }

    .cuvee-desc strong {
      color: #133425;
    }

    .cuvee-box-pairings {
      background: rgba(185, 140, 68, 0.09);
      border-left: 2pt solid #B98C44;
      padding: 1mm 2mm;
      font-size: 6.2pt;
      color: #2F4437;
      line-height: 1.25;
    }

    .cuvee-box-pairings strong {
      color: #8C6A30;
      text-transform: uppercase;
      font-size: 5.6pt;
      letter-spacing: 0.3px;
      display: block;
      margin-bottom: 0.2mm;
    }

    /* Bandeau Service */
    .service-banner {
      background: #133425;
      color: #F6EAD0;
      border-radius: 4px;
      padding: 1.8mm 3mm;
      display: flex;
      align-items: center;
      justify-content: space-around;
      font-size: 6.3pt;
      margin-bottom: 1.8mm;
    }

    .service-point {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .service-point strong {
      color: #E5BE72;
      font-weight: 600;
    }

    /* Footer */
    .footer {
      border-top: 0.5pt solid #DFD2B7;
      padding-top: 1.5mm;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 6pt;
      color: #556B5F;
    }

    .footer-left strong {
      color: #133425;
      font-size: 6.8pt;
      display: block;
    }

    .footer-right {
      text-align: right;
    }

    .footer-right a {
      color: #8C6A30;
      font-weight: 700;
      text-decoration: none;
      font-size: 7pt;
    }

    .swiss-flag {
      display: inline-block;
      width: 8px;
      height: 8px;
      background: #D52B1E;
      color: white;
      text-align: center;
      line-height: 8px;
      font-size: 6.5px;
      font-weight: bold;
      border-radius: 1px;
      margin-right: 2px;
      vertical-align: middle;
    }

    /* Impression */
    @media print {
      body {
        background: transparent;
        padding: 0;
      }
      .toolbar {
        display: none !important;
      }
      .a5-page {
        box-shadow: none !important;
        margin: 0 !important;
        width: 148mm !important;
        height: 210mm !important;
      }
    }
  </style>
</head>
<body>

  <!-- BARRE D'OUTILS ECRAN (NON IMPRIMEE) -->
  <div class="toolbar no-print">
    <h2>📄 Fiche A5 Dégustation Congrès</h2>
    <button class="btn" onclick="window.print()">
      🖨️ Imprimer la fiche (A5 / PDF)
    </button>
    <a href="flyer-a5-degustation.pdf" class="btn btn-secondary" download>
      📥 Télécharger le PDF Direct
    </a>
  </div>

  <!-- PAGE A5 IMPRIMABLE -->
  <div class="a5-page">
    <div class="outer-border"></div>
    <div class="inner-border"></div>
    <div class="corner corner-tl"></div>
    <div class="corner corner-tr"></div>
    <div class="corner corner-bl"></div>
    <div class="corner corner-br"></div>

    <div class="page-content">
      
      <!-- EN-TETE PRESTIGE -->
      <div class="header">
        <div class="logo-container">
          <!-- Emblème Pomme Drinkcider SVG Vectoriel -->
          <svg class="logo-emblem" viewBox="0 0 800 800" fill="none">
            <circle cx="400" cy="400" r="380" fill="#133425"/>
            <path d="M400 256C365 224 318 227 285 259C252 291 244 346 259 396C278 459 331 493 400 496C469 493 522 459 541 396C556 346 548 291 515 259C482 227 435 224 400 256Z" fill="#F6EAD0"/>
            <path d="M384 225C390 193 402 167 425 145" stroke="#B98C44" stroke-width="26" stroke-linecap="round"/>
            <path d="M408.059 207.677C442.918 153.522 504.543 143.961 542.417 163.724C511.144 213.282 459.584 231.131 408.059 207.677Z" fill="#B98C44"/>
          </svg>
          <div class="brand-group">
            <div class="brand-sup"><span class="swiss-flag">+</span> Terroir Fribourgeois • Cidrerie d'Auteur</div>
            <div class="brand-main">Cidrerie du Vulcain</div>
          </div>
        </div>

        <div class="event-badge">
          ✦ Fiche Dégustation • À l'occasion de votre Congrès Anniversaire ✦
        </div>

        <div class="gold-line">
          <div class="gold-line-bar"></div>
          <div class="gold-diamond"></div>
          <div class="gold-line-bar"></div>
        </div>
      </div>

      <!-- 1. HISTOIRE DU DOMAINE -->
      <div class="section-box">
        <div class="section-title">
          <span class="bullet">❦</span> L’Histoire : Un Pionnier du Grand Cidre en Suisse
        </div>
        <p class="story-body">
          Biologiste de formation, <strong>Jacques Perritaz</strong> fonde la <strong>Cidrerie du Vulcain</strong> en 2006 au Mouret (Fribourg). Sa vocation : réhabiliter le patrimoine fruitier helvétique et élever le cidre au rang des <strong>plus grands vins de gastronomie</strong>. Inspiré par le papillon <em>Vulcain</em> qui se délecte des fruits mûrs à l’automne, Jacques élabore des cuvées vivantes et cristallines, aujourd’hui plébiscitées sur les plus prestigieuses tables étoilées du monde.
        </p>
      </div>

      <!-- 2. ORIGINE & PARTICULARITES -->
      <div class="pillars-grid">
        <div class="pillar-card">
          <span class="pillar-icon">🌳</span>
          <div class="pillar-head">Arbres Hautes-Tiges</div>
          <div class="pillar-txt">Vergers centenaires de plein vent, sans traitement chimique. Des racines profondes puisant la minéralité des sols fribourgeois.</div>
        </div>
        <div class="pillar-card">
          <span class="pillar-icon">🍏</span>
          <div class="pillar-head">Variétés Rares</div>
          <div class="pillar-txt">Fruits anciens cueillis à la main : Bohnapfel, Boskoop, pommes sauvages acidulées, poires à poiré et coings d'antan.</div>
        </div>
        <div class="pillar-card">
          <span class="pillar-icon">✨</span>
          <div class="pillar-head">100% Pur Jus Vivant</div>
          <div class="pillar-txt">Fermentation spontanée aux levures indigènes. Prise de mousse naturelle en bouteille. Zéro intrant œnologique (~6-7% vol).</div>
        </div>
      </div>

      <!-- 3. LES DEUX CUVÉES À L'HONNEUR -->
      <div>
        <div class="section-title" style="margin-bottom: 1.8mm;">
          <span class="bullet">🍾</span> Les Deux Cuvées Servies à Vos Invités
        </div>
        <div class="cuvees-grid">
          
          <!-- CUVÉE 1 -->
          <div class="cuvee-card">
            <div class="badge-tag">Apéritif & Éclat</div>
            <div>
              <div class="cuvee-title">Turgowy</div>
              <div class="cuvee-sub">Cidre de Pommes Anciennes • Sec</div>
              <div class="cuvee-desc">
                <strong>Origine :</strong> Variétés hautes-tiges traditionnelles (Boskoop, Bohnapfel).<br>
                <strong>Profil :</strong> Vif, cristallin et minéral. Arômes de pomme fraîche croquante, fleurs blanches et tension désaltérante. Bulle fine et aérienne.
              </div>
            </div>
            <div class="cuvee-box-pairings">
              <strong>Accords & Moments Idéaux</strong>
              Parfait pour le toast d'accueil, apéritifs, gougères, poissons du lac et fromages frais.
            </div>
          </div>

          <!-- CUVÉE 2 -->
          <div class="cuvee-card special">
            <div class="badge-tag">Signature & Banquet</div>
            <div>
              <div class="cuvee-title">Trois Pépins</div>
              <div class="cuvee-sub">Pommes • Poires • Coings • Extra-Brut</div>
              <div class="cuvee-desc">
                <strong>Origine :</strong> L'assemblage emblématique unique au monde.<br>
                <strong>Profil :</strong> Profond, vineux et d'une rare distinction. Notes de coing compoté, cire d'abeille et épices douces. Structure racée digne d'un grand cru.
              </div>
            </div>
            <div class="cuvee-box-pairings">
              <strong>Accords & Moments Idéaux</strong>
              Magnifique compagnon de banquet, volailles, charcuteries fines et Gruyère AOP affiné.
            </div>
          </div>

        </div>
      </div>

      <!-- 4. SERVICE & CONSEILS -->
      <div class="service-banner">
        <div class="service-point">
          <span>🌡️</span>
          <span>Température : <strong>8°C – 10°C</strong></span>
        </div>
        <div class="service-point">
          <span>🍷</span>
          <span>Verre : <strong>Verre à vin blanc tulipe</strong></span>
        </div>
        <div class="service-point">
          <span>🥂</span>
          <span>Ambiance : <strong>Festif, raffiné & digeste</strong></span>
        </div>
      </div>

      <!-- FOOTER -->
      <div class="footer">
        <div class="footer-left">
          <strong>Drinkcider.ch — Sélection Officielle des Meilleurs Cidres Suisses</strong>
          Cidres & Poirés d’Artisans au Mouret (Fribourg) • Livraison soignée dans toute la Suisse
        </div>
        <div class="footer-right">
          Cuvées disponibles en ligne :<br>
          <a href="https://www.drinkcider.ch" target="_blank">www.drinkcider.ch</a>
        </div>
      </div>

    </div>
  </div>

</body>
</html>
`

fs.writeFileSync('public/flyer-a5-degustation.html', htmlContent)
console.log('Updated public/flyer-a5-degustation.html')

// Render to PDF using Edge headless
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const htmlAbsPath = path.resolve('public/flyer-a5-degustation.html')
const pdfOutPath = path.resolve('public/flyer-a5-degustation.pdf')

try {
  console.log('Generating updated A5 PDF...')
  const cmd = `"${edgePath}" --headless --disable-gpu --run-all-compositor-stages-before-draw --no-pdf-header-footer --print-to-pdf="${pdfOutPath}" "file:///${htmlAbsPath.replace(/\\/g, '/')}"`
  execSync(cmd)
  console.log('Successfully regenerated public/flyer-a5-degustation.pdf!')
} catch (e) {
  console.error('Edge print error:', e.message)
}
