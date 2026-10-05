/**
 * Module d'exportation de commandes au format CSV officiel Planzer Colis.
 * Spécifications : Documentation Planzer « Instruction importation de commande Planzer Colis ».
 * Encodage : UTF-8 sans BOM, séparateur ';'
 */

export interface PlanzerSenderConfig {
  clientNumber: string // ex: "169729"
  department: string // ex: "3" (Service Paket - 3)
  firstName: string // "Bertrand"
  lastName: string // "Baeriswyl"
  company: string // "" ou "Drinkcider"
  country: string // "CH"
  city: string // "Les Paccots"
  npa: string // "1619"
  street: string // "Chemin des Moilles"
  houseNumber: string // "16"
  instructions: string // "Prendre les colis sur l'établi sous le couvert"
  mobilePhone: string // "0768306215"
  email: string // "commandes@drinkcider.ch"
  lang: string // "fr"
}

export const DEFAULT_PLANZER_SENDER: PlanzerSenderConfig = {
  clientNumber: '169729',
  department: '3',
  firstName: 'Bertrand',
  lastName: 'Baeriswyl',
  company: 'Drinkcider',
  country: 'CH',
  city: 'Les Paccots',
  npa: '1619',
  street: 'Chemin des Moilles',
  houseNumber: '16',
  instructions: "Prendre les colis sur l'établi sous le couvert",
  mobilePhone: '0768306215',
  email: 'commandes@drinkcider.ch',
  lang: 'fr',
}

/**
 * Nettoie une chaîne pour le CSV Planzer :
 * Retire les point-virgules, sauts de ligne et espaces superflus.
 */
export function sanitizePlanzerText(str?: string | null, maxLength = 100): string {
  if (!str) return ''
  return str
    .replace(/[;\r\n\t]+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

/**
 * Découpe une adresse suisse en Nom de rue et Numéro de maison.
 * Exemples :
 * - "Chemin des Moilles 16" -> street: "Chemin des Moilles", houseNumber: "16"
 * - "Grand-Rue 4B" -> street: "Grand-Rue", houseNumber: "4B"
 * - "Route du Village 12-14" -> street: "Route du Village", houseNumber: "12-14"
 * - "Chemin des Moilles" -> street: "Chemin des Moilles", houseNumber: ""
 */
export function splitStreetAndNumber(rawAddress: string): { street: string; houseNumber: string } {
  if (!rawAddress) return { street: '', houseNumber: '' }
  const clean = rawAddress.trim().replace(/[;\r\n]+/g, ' ')

  // Recherche du numéro à la fin de l'adresse (ex: " 16", " 16b", " 16 B", " 12-14")
  const match = clean.match(/^(.*?)(?:[,\s]+)(\d+[\s\-/]?[a-zA-Z0-9]*)$/)
  if (match && match[1] && match[2]) {
    return {
      street: sanitizePlanzerText(match[1], 100),
      houseNumber: sanitizePlanzerText(match[2], 10),
    }
  }

  return {
    street: sanitizePlanzerText(clean, 100),
    houseNumber: '',
  }
}

/**
 * Formate une date en JJ.MM.AAAA (fuseau horaire Suisse)
 */
export function formatPlanzerDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}.${month}.${year}`
}

/**
 * Calcule la date d'enlèvement par défaut et la date de livraison prévue.
 * Règle Planzer : la date de retrait et de livraison ne peuvent JAMAIS être le même jour.
 * Si saisi après 14h, l'enlèvement est généralement le lendemain ouvré.
 */
export function getDefaultPlanzerDates(baseDate = new Date()): {
  pickupDate: Date
  deliveryDate: Date
} {
  const pickup = new Date(baseDate)

  // Si on est après 14h, enlèvement dès demain ouvré
  if (pickup.getHours() >= 14) {
    pickup.setDate(pickup.getDate() + 1)
  }

  // Si l'enlèvement tombe un samedi (6) ou dimanche (0), décaler au lundi suivant
  if (pickup.getDay() === 6) {
    pickup.setDate(pickup.getDate() + 2)
  } else if (pickup.getDay() === 0) {
    pickup.setDate(pickup.getDate() + 1)
  }

  // La livraison est au minimum J+1 ouvré
  const delivery = new Date(pickup)
  delivery.setDate(delivery.getDate() + 1)
  if (delivery.getDay() === 6) {
    delivery.setDate(delivery.getDate() + 2)
  } else if (delivery.getDay() === 0) {
    delivery.setDate(delivery.getDate() + 1)
  }

  return { pickupDate: pickup, deliveryDate: delivery }
}

export interface PlanzerOrderItem {
  productName: string
  quantity: number
  bottlesPerUnit?: number
  bottleSize?: string | null
}

export interface PlanzerOrderData {
  id: string
  numero: string
  clientName: string
  clientEmail: string
  clientPhone?: string | null
  clientType?: string | null
  address: string
  npa: string
  city: string
  deliveryDate?: Date | string | null
  message?: string | null
  isPickup?: boolean
  items: PlanzerOrderItem[]
}

export interface PlanzerPackage {
  weightKg: number
  reference: string
  content: string
}

/**
 * Calcule les colis (cartons) pour une commande.
 * Chaque carton génère une ligne P1 distincte (permettant à Planzer d'imprimer
 * 1 étiquette par carton avec son propre code-barres : colis 1/2, 2/2, etc.).
 */
export function calculateOrderPackages(order: PlanzerOrderData): PlanzerPackage[] {
  const packages: PlanzerPackage[] = []

  let looseSmallBottles = 0 // 27.5cl
  let looseLargeBottles = 0 // 75cl

  for (const item of order.items) {
    const bpu = item.bottlesPerUnit || 1
    const nameLower = item.productName.toLowerCase()

    // 1. Cartons complets de 24 (format 24×27.5cl)
    if (bpu === 24 || nameLower.includes('24x') || nameLower.includes('24×')) {
      for (let i = 0; i < item.quantity; i++) {
        packages.push({
          weightKg: 15.0, // carton de 24 x 27.5cl ~ 15 kg
          reference: order.numero,
          content: 'Cidre artisanal 24x27.5cl',
        })
      }
      continue
    }

    // 2. Cartons complets de 12 (format 12×75cl)
    if (bpu === 12 || nameLower.includes('12x') || nameLower.includes('12×')) {
      for (let i = 0; i < item.quantity; i++) {
        packages.push({
          weightKg: 17.0, // carton de 12 x 75cl ~ 17 kg
          reference: order.numero,
          content: 'Cidre artisanal 12x75cl',
        })
      }
      continue
    }

    // 3. Cartons complets de 6 (format 6×75cl)
    if (bpu === 6 || nameLower.includes('6x') || nameLower.includes('6×')) {
      for (let i = 0; i < item.quantity; i++) {
        packages.push({
          weightKg: 8.5, // carton de 6 x 75cl ~ 8.5 kg
          reference: order.numero,
          content: 'Cidre artisanal 6x75cl',
        })
      }
      continue
    }

    // 4. Bouteilles unitaires
    const isSmall =
      item.bottleSize === '27.5cl' ||
      item.bottleSize === '33cl' ||
      nameLower.includes('27.5') ||
      nameLower.includes('effervescence')

    if (isSmall) {
      looseSmallBottles += item.quantity * bpu
    } else {
      looseLargeBottles += item.quantity * bpu
    }
  }

  // Regroupement des bouteilles 27.5cl en cartons de 24
  while (looseSmallBottles >= 24) {
    packages.push({
      weightKg: 15.0,
      reference: order.numero,
      content: 'Cidre artisanal 24x27.5cl',
    })
    looseSmallBottles -= 24
  }
  if (looseSmallBottles > 0) {
    const weight = Math.max(1.0, Math.round((looseSmallBottles * 0.6 + 0.5) * 10) / 10)
    packages.push({
      weightKg: weight,
      reference: order.numero,
      content: 'Cidre artisanal 27.5cl',
    })
  }

  // Regroupement des bouteilles 75cl en cartons de 12 ou 6
  while (looseLargeBottles >= 12) {
    packages.push({
      weightKg: 17.0,
      reference: order.numero,
      content: 'Cidre & Poiré 12x75cl',
    })
    looseLargeBottles -= 12
  }
  if (looseLargeBottles >= 6) {
    packages.push({
      weightKg: 8.5,
      reference: order.numero,
      content: 'Cidre & Poiré 6x75cl',
    })
    looseLargeBottles -= 6
  }
  if (looseLargeBottles > 0) {
    const weight = Math.max(1.5, Math.round((looseLargeBottles * 1.4 + 0.5) * 10) / 10)
    packages.push({
      weightKg: weight,
      reference: order.numero,
      content: 'Cidre & Poiré 75cl',
    })
  }

  // Sécurité : si aucun article n'a pu être groupé, au moins 1 colis par défaut
  if (packages.length === 0) {
    packages.push({
      weightKg: 5.0,
      reference: order.numero,
      content: 'Cidre artisanal',
    })
  }

  return packages
}

export interface GeneratePlanzerCsvOptions {
  sender?: Partial<PlanzerSenderConfig>
  pickupDate?: Date
  deliveryDate?: Date
}

/**
 * Génère le contenu CSV complet pour un ensemble de commandes.
 */
export function generatePlanzerCsv(
  orders: PlanzerOrderData[],
  options: GeneratePlanzerCsvOptions = {}
): string {
  const sender: PlanzerSenderConfig = {
    ...DEFAULT_PLANZER_SENDER,
    ...options.sender,
  }

  const defaultDates = getDefaultPlanzerDates()
  const pickup = options.pickupDate ? new Date(options.pickupDate) : defaultDates.pickupDate
  const delivery = options.deliveryDate
    ? new Date(options.deliveryDate)
    : (() => {
        const d = new Date(pickup)
        d.setDate(d.getDate() + 1)
        if (d.getDay() === 6) d.setDate(d.getDate() + 2)
        if (d.getDay() === 0) d.setDate(d.getDate() + 1)
        return d
      })()

  const formattedPickup = formatPlanzerDate(pickup)
  const formattedDelivery = formatPlanzerDate(delivery)

  const lines: string[] = []

  for (const order of orders) {
    // Exclusion des retraits en cave
    if (order.isPickup) continue

    // 1. Découpage du destinataire
    const { street, houseNumber } = splitStreetAndNumber(order.address)

    // Séparation Prénom / Nom
    const nameParts = (order.clientName || '').trim().split(/\s+/)
    let destFirstName = ''
    let destLastName = ''
    let destCompany = ''

    if (order.clientType === 'PRO') {
      destCompany = sanitizePlanzerText(order.clientName, 100)
      destLastName = sanitizePlanzerText(order.clientName, 100)
    } else if (nameParts.length > 1) {
      destFirstName = sanitizePlanzerText(nameParts[0], 100)
      destLastName = sanitizePlanzerText(nameParts.slice(1).join(' '), 100)
    } else {
      destLastName = sanitizePlanzerText(order.clientName, 100)
    }

    const destPhone = sanitizePlanzerText(order.clientPhone || '', 20)
    const destEmail = sanitizePlanzerText(order.clientEmail || '', 255)
    const destInstructions = sanitizePlanzerText(order.message || '', 250)

    // Ligne A1 : exactement 43 champs (indices 0 à 42)
    const a1Fields = [
      'A1', // 0: Type de record
      sender.clientNumber, // 1: Numéro de client (169729)
      sender.department, // 2: Numéro de département (3)
      '', // 3: Exp. civilité
      sanitizePlanzerText(sender.firstName, 100), // 4: Exp. prénom (Bertrand)
      sanitizePlanzerText(sender.lastName, 100), // 5: Exp. nom de famille (Baeriswyl)
      sanitizePlanzerText(sender.company, 100), // 6: Exp. entreprise
      '', // 7: Exp. complément d'entreprise
      'CH', // 8: Exp. pays
      sanitizePlanzerText(sender.city, 100), // 9: Exp. lieu (Les Paccots)
      sanitizePlanzerText(sender.npa, 12), // 10: Exp. NPA (1619)
      sanitizePlanzerText(sender.street, 100), // 11: Exp. rue (Chemin des Moilles)
      sanitizePlanzerText(sender.houseNumber, 10), // 12: Exp. numéro de la maison (16)
      sanitizePlanzerText(sender.instructions, 250), // 13: Exp. instructions
      '', // 14: Exp. téléphone fixe
      sanitizePlanzerText(sender.mobilePhone, 20), // 15: Exp. téléphone mobile (0768306215)
      sanitizePlanzerText(sender.email, 255), // 16: Exp. e-mail
      sender.lang || 'fr', // 17: Exp. langue
      formattedPickup, // 18: Date d'enlèvement (JJ.MM.AAAA)
      '', // 19: Dest. civilité
      destFirstName, // 20: Dest. prénom
      destLastName, // 21: Dest. nom de famille
      destCompany, // 22: Dest. entreprise
      '', // 23: Dest. complément d'entreprise
      'CH', // 24: Dest. pays
      sanitizePlanzerText(order.city, 100), // 25: Dest. lieu
      sanitizePlanzerText(order.npa, 12), // 26: Dest. NPA
      street, // 27: Dest. rue
      houseNumber, // 28: Dest. numéro de maison
      destInstructions, // 29: Dest. instructions
      '', // 30: Dest. téléphone fixe
      destPhone, // 31: Dest. téléphone mobile
      destEmail, // 32: Dest. e-mail
      'fr', // 33: Dest. langue
      formattedDelivery, // 34: Date de livraison (JJ.MM.AAAA)
      sanitizePlanzerText(order.numero, 100), // 35: Référence (CMD-2026-XXXX)
      '', // 36: Remarques
      '', // 37: Service d'enlèvement
      '', // 38: Service de livraison
      '', // 39: Contrôle d'identité
      '', // 40: Contrôle d'identité Date
      '', // 41: Remarque pour le dépôt (enlèvement)
      '', // 42: Valeur assurée
    ]

    lines.push(a1Fields.join(';'))

    // Lignes P1 : une par colis
    const packages = calculateOrderPackages(order)
    for (const pkg of packages) {
      const p1Fields = [
        'P1', // 0: Type de record
        'PAKE', // 1: Emballage fixe
        '', // 2: Longueur (cm)
        '', // 3: Largeur (cm)
        '', // 4: Hauteur (cm)
        pkg.weightKg.toFixed(1), // 5: Poids en kg avec 1 décimale
        sanitizePlanzerText(pkg.content, 100), // 6: Contenu
        sanitizePlanzerText(pkg.reference, 100), // 7: Référence
      ]
      lines.push(p1Fields.join(';'))
    }

    // Ligne O1 : autorisation de dépôt par défaut
    // (le mode de livraison le plus courant en Suisse pour le particulier et pro)
    lines.push('O1;Depot')
  }

  return lines.join('\r\n') + '\r\n'
}
