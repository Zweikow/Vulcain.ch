/**
 * Script d'import des clients depuis le fichier CSV de relecture.
 *
 * Utilisation :
 *   Simulation sur dev :      node scripts/import-clients.js
 *   Simulation sur prod/autre: node scripts/import-clients.js --db="postgresql://user:pass@host:5432/dbname"
 *   Ecriture reelle :         node scripts/import-clients.js --write
 *   Ecriture sans prompt :    node scripts/import-clients.js --write --yes
 */

require('dotenv').config()
const fs = require('fs')
const path = require('path')
const readline = require('readline')
const { PrismaClient } = require('@prisma/client')

// Detection du fichier CSV (version corrigee prioritaire ou plus recente)
function getCsvPath() {
  const customFileArg = process.argv.find((a) => a.startsWith('--file='))
  if (customFileArg) {
    return path.resolve(customFileArg.slice(7).replace(/^["']|["']$/g, ''))
  }
  const fileCorrige = path.join(__dirname, '..', 'imports', 'clients-relecture-corrige.csv')
  const fileStandard = path.join(__dirname, '..', 'imports', 'clients-relecture.csv')
  if (fs.existsSync(fileCorrige) && fs.existsSync(fileStandard)) {
    const statCorrige = fs.statSync(fileCorrige)
    const statStandard = fs.statSync(fileStandard)
    return statCorrige.mtimeMs >= statStandard.mtimeMs ? fileCorrige : fileStandard
  }
  if (fs.existsSync(fileCorrige)) return fileCorrige
  if (fs.existsSync(fileStandard)) return fileStandard
  return fileCorrige
}

// Extraction de la base ciblee
function getTargetDbUrl() {
  const dbArg = process.argv.find((a) => a.startsWith('--db='))
  if (dbArg) {
    return dbArg.slice(5).replace(/^["']|["']$/g, '')
  }
  return process.env.DATABASE_URL || ''
}

const targetDbUrl = getTargetDbUrl()
const isCustomDb = process.argv.some((a) => a.startsWith('--db='))

// Verification stricte de securite si base par defaut
if (!isCustomDb) {
  if (!targetDbUrl.includes('192.168.1.36') || !targetDbUrl.includes('drinkcider_dev')) {
    console.error(
      '[SECURITE] La variable DATABASE_URL ne pointe pas vers 192.168.1.36 (base drinkcider_dev).'
    )
    console.error(`URL detectee : ${targetDbUrl.replace(/:[^:@]+@/, ':***@')}`)
    console.error('Arret immediat par securite.')
    process.exit(1)
  }
}

const prisma = new PrismaClient({
  datasources: {
    db: { url: targetDbUrl },
  },
})

// Normalisation des numeros de telephone
function normalizePhone(raw) {
  if (!raw) return null
  let cleaned = raw.trim().replace(/[\s\.\-\/\(\)]/g, '')
  if (cleaned === '') return null

  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.slice(2)
  }

  // Cas Suisse avec indicatif : +41...
  if (cleaned.startsWith('+41')) {
    const digits = cleaned.slice(3).replace(/^0/, '')
    if (digits.length === 9) {
      return `+41 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`
    }
  }

  // Cas Suisse national : 079..., 021..., 032...
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    const digits = cleaned.slice(1)
    return `+41 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`
  }

  // Cas etranger Allemagne +49
  if (cleaned.startsWith('+49')) {
    const digits = cleaned.slice(3)
    return `+49 ${digits.slice(0, 3)} ${digits.slice(3)}`
  }

  return cleaned
}

function normalizeAddressKey(street, npa, city) {
  return `${street || ''} ${npa || ''} ${city || ''}`.toLowerCase().replace(/[^a-z0-9]/g, '')
}

// Parser RFC 4180
function parseCsv(content) {
  const cleaned = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content
  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim() !== '')
  if (lines.length === 0) return []

  function splitLine(line) {
    const fields = []
    let cur = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (c === ',' && !inQuotes) {
        fields.push(cur.trim())
        cur = ''
      } else {
        cur += c
      }
    }
    fields.push(cur.trim())
    return fields
  }

  const headers = splitLine(lines[0]).map((h) => h.replace(/^"|"$/g, ''))
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const values = splitLine(lines[i])
    const row = {}
    headers.forEach((h, idx) => {
      row[h] = values[idx] || ''
    })
    rows.push(row)
  }
  return rows
}

function parseDateFr(str) {
  if (!str) return new Date()
  const m = str.match(/([0-9]{2})\.([0-9]{2})\.([0-9]{4})/)
  if (m) {
    return new Date(`${m[3]}-${m[2]}-${m[1]}T12:00:00Z`)
  }
  return new Date()
}

function askConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  return new Promise((resolve) => {
    rl.question(question, (ans) => {
      rl.close()
      resolve(ans.trim().toLowerCase())
    })
  })
}

async function main() {
  const isWriteMode = process.argv.includes('--write')
  const skipConfirm = process.argv.includes('--yes')
  const csvFile = getCsvPath()

  const sanitizedUrl = targetDbUrl.replace(/:[^:@]+@/, ':***@')
  console.log('====================================================')
  console.log(`Datasource : ${sanitizedUrl}`)
  console.log(`Fichier CSV source : ${csvFile}`)
  console.log(`Mode : ${isWriteMode ? '*** ECRITURE REELLE ***' : 'SIMULATION (lecture seule)'}`)
  console.log('====================================================\n')

  if (!fs.existsSync(csvFile)) {
    console.error(`Fichier introuvable : ${csvFile}`)
    process.exit(1)
  }

  const allRows = parseCsv(fs.readFileSync(csvFile, 'utf8'))
  console.log(`Total lignes chargees : ${allRows.length}\n`)

  // 1. Filtrage des fiches avec anomalies
  const validRows = []
  const ignoredRows = []

  allRows.forEach((r, idx) => {
    if (r.anomalies && r.anomalies.trim() !== '') {
      ignoredRows.push({
        line: idx + 2,
        email: r.email,
        name: `${r.prenom_propose || ''} ${r.nom_propose || r.nom_brut}`.trim(),
        reason: r.anomalies.trim(),
      })
    } else {
      validRows.push(r)
    }
  })

  // 2. Detection des doublons sur telephone et adresse
  const phoneGroups = new Map()
  const addressGroups = new Map()

  validRows.forEach((r) => {
    const p = normalizePhone(r.telephone)
    if (p) {
      if (!phoneGroups.has(p)) phoneGroups.set(p, [])
      phoneGroups.get(p).push(r)
    }

    const aKey = normalizeAddressKey(r.adresse, r.npa, r.localite)
    if (aKey && aKey.length > 5) {
      if (!addressGroups.has(aKey)) addressGroups.set(aKey, [])
      addressGroups.get(aKey).push(r)
    }
  })

  const duplicatePhoneCases = []
  for (const [phone, list] of phoneGroups.entries()) {
    if (list.length > 1) {
      duplicatePhoneCases.push({ phone, list })
    }
  }

  const duplicateAddressCases = []
  for (const [aKey, list] of addressGroups.entries()) {
    if (list.length > 1) {
      duplicateAddressCases.push({ aKey, list })
    }
  }

  // Affichage du resume pre-traitement
  console.log('--- Verification des anomalies et doublons ---')
  if (ignoredRows.length > 0) {
    console.log(`[FICHES IGNOREES : ${ignoredRows.length}] :`)
    ignoredRows.forEach((ig) => {
      console.log(`   - Ligne ${ig.line} : ${ig.email} (${ig.name}) -> Motif : ${ig.reason}`)
    })
  } else {
    console.log('Aucune fiche avec anomalie dans le fichier.')
  }

  // Verification des emails dupliques dans le CSV
  const emailGroups = new Map()
  validRows.forEach((r) => {
    const e = r.email.toLowerCase().trim()
    if (!emailGroups.has(e)) emailGroups.set(e, [])
    emailGroups.get(e).push(r)
  })
  const duplicateEmailCases = [...emailGroups.entries()].filter(([_, list]) => list.length > 1)
  if (duplicateEmailCases.length > 0) {
    console.log(`\n[DOUBLONS D'E-MAIL DANS LE CSV : ${duplicateEmailCases.length}] :`)
    duplicateEmailCases.forEach(([email, list]) => {
      console.log(`   - E-mail ${email} present ${list.length} fois`)
    })
  } else {
    console.log(
      "\n[DOUBLONS D'E-MAIL] : Aucun doublon d'e-mail dans le CSV (36 e-mails distincts)."
    )
  }

  if (duplicatePhoneCases.length > 0) {
    console.log(`\n[DOUBLONS DE TELEPHONE DETECTES : ${duplicatePhoneCases.length}] :`)
    duplicatePhoneCases.forEach((dp) => {
      console.log(
        `   - Numero ${dp.phone} partage par ${dp.list.length} fiches distinctes (creations independantes conformes a la consigne) :`
      )
      dp.list.forEach((r) => {
        console.log(
          `       * ${r.email} | ${r.prenom_propose} ${r.nom_propose} | ${r.adresse} ${r.npa} ${r.localite}`
        )
      })
    })
  } else {
    console.log('\n[DOUBLONS DE TELEPHONE] : Aucun doublon de telephone.')
  }

  if (duplicateAddressCases.length > 0) {
    console.log(`\n[DOUBLONS D'ADRESSE DETECTES : ${duplicateAddressCases.length}] :`)
    duplicateAddressCases.forEach((da) => {
      const first = da.list[0]
      console.log(
        `   - Adresse "${first.adresse}, ${first.npa} ${first.localite}" partagee par ${da.list.length} fiches distinctes (creations independantes conformes a la consigne) :`
      )
      da.list.forEach((r) => {
        console.log(
          `       * ${r.email} | ${r.prenom_propose} ${r.nom_propose} | tel: ${normalizePhone(r.telephone) || 'aucun'}`
        )
      })
    })
  } else {
    console.log("\n[DOUBLONS D'ADRESSE] : Aucun doublon d'adresse.")
  }

  console.log(
    `\nFiches eligibles a l'import : ${validRows.length} (sur ${allRows.length} lignes du CSV)\n`
  )

  if (isWriteMode && !skipConfirm) {
    const confirm = await askConfirmation(
      `Confirmez-vous l'ecriture de ces ${validRows.length} fiches dans la base ? (ecrire 'oui' pour continuer) : `
    )
    if (confirm !== 'oui') {
      console.log('Operation annulee.')
      process.exit(0)
    }
  }

  // 3. Pre-chargement des clients existants en base
  const validEmails = validRows.map((r) => r.email.toLowerCase().trim())
  const existingClients = await prisma.customer.findMany({
    where: { email: { in: validEmails } },
  })
  const existingMap = new Map(existingClients.map((c) => [c.email.toLowerCase(), c]))

  let countToCreate = 0
  let countToComplete = 0
  let countUnchanged = 0

  const actions = []

  for (const r of validRows) {
    const email = r.email.toLowerCase().trim()
    const existing = existingMap.get(email)

    const isPro = r.is_pro === 'true' || r.is_pro === '1' || r.is_pro === 'TRUE'
    const firstDate = r.date_premiere_commande
    const lastDate = r.date_derniere_commande
    const orderCountNum = parseInt(r.nb_commandes || '0', 10)

    // Phrase standard des notes
    let standardPhrase = ''
    if (orderCountNum === 0 || (!firstDate && !lastDate)) {
      standardPhrase = "Contact professionnel de l'ancienne boutique"
    } else if (orderCountNum === 1 || firstDate === lastDate) {
      standardPhrase = `Client de l'ancienne boutique, 1 commande le ${firstDate}`
    } else {
      standardPhrase = `Client de l'ancienne boutique, ${orderCountNum} commandes entre ${firstDate} et ${lastDate}`
    }

    let finalNote = standardPhrase
    if (r.notes && r.notes.trim() !== '') {
      finalNote = `${standardPhrase}. ${r.notes.trim()}`
    }

    const normPhoneVal = normalizePhone(r.telephone)

    if (existing) {
      // Completer uniquement les champs vides, ne rien ecraser
      const updates = {}
      const ecarts = []

      // Ecarts que le script ne corrige pas (conserves tels quels en base)
      const csvLastName = (r.nom_propose || r.nom_brut || '').trim()
      if (existing.lastName.trim().toLowerCase() !== csvLastName.toLowerCase()) {
        ecarts.push(`Nom : base="${existing.lastName}" vs CSV="${csvLastName}"`)
      }

      const csvFirstName = (r.prenom_propose || '').trim()
      if (existing.firstName.trim().toLowerCase() !== csvFirstName.toLowerCase()) {
        ecarts.push(`Prenom : base="${existing.firstName}" vs CSV="${csvFirstName}"`)
      }

      if (existing.isPro !== isPro) {
        ecarts.push(`is_pro : base=${existing.isPro} vs CSV=${isPro}`)
      }

      if (existing.phone && normPhoneVal && existing.phone !== normPhoneVal) {
        ecarts.push(`Telephone : base="${existing.phone}" vs CSV="${normPhoneVal}"`)
      }

      if (
        existing.address &&
        r.adresse &&
        existing.address.toLowerCase().trim() !== r.adresse.toLowerCase().trim()
      ) {
        ecarts.push(`Adresse : base="${existing.address}" vs CSV="${r.adresse}"`)
      }

      if (existing.npa && r.npa && existing.npa.trim() !== r.npa.trim()) {
        ecarts.push(`NPA : base="${existing.npa}" vs CSV="${r.npa}"`)
      }

      if (
        existing.city &&
        r.localite &&
        existing.city.toLowerCase().trim() !== r.localite.toLowerCase().trim()
      ) {
        ecarts.push(`Localite : base="${existing.city}" vs CSV="${r.localite}"`)
      }

      // Champs vides a completer
      if ((existing.phone === null || existing.phone === '') && normPhoneVal) {
        updates.phone = normPhoneVal
      }
      if ((existing.address === null || existing.address === '') && r.adresse) {
        updates.address = r.adresse
      }
      if ((existing.npa === null || existing.npa === '') && r.npa) {
        updates.npa = r.npa
      }
      if ((existing.city === null || existing.city === '') && r.localite) {
        updates.city = r.localite
      }

      // Notes :
      // - Si vide en base : ecrire la note finale de l'import
      // - Si deja renseignee en base : ajouter a la suite si standardPhrase n'y est pas deja
      if (existing.notes === null || existing.notes.trim() === '') {
        if (finalNote) {
          updates.notes = finalNote
        }
      } else {
        if (!existing.notes.includes(standardPhrase)) {
          updates.notes = `${existing.notes.trim()}\n${finalNote}`
        }
      }

      if (Object.keys(updates).length > 0) {
        countToComplete++
        actions.push({
          type: 'COMPLETE',
          email,
          id: existing.id,
          updates,
          ecarts,
          existing,
        })
      } else {
        countUnchanged++
        actions.push({
          type: 'UNCHANGED',
          email,
          id: existing.id,
          ecarts,
          existing,
        })
      }
    } else {
      countToCreate++
      actions.push({
        type: 'CREATE',
        email,
        data: {
          email,
          firstName: r.prenom_propose || '',
          lastName: r.nom_propose || r.nom_brut || '',
          phone: normPhoneVal,
          address: r.adresse || '',
          npa: r.npa || '',
          city: r.localite || '',
          isPro,
          acceptsMarketing: false,
          notes: finalNote,
          createdAt: parseDateFr(firstDate),
        },
      })
    }
  }

  console.log("--- Plan d'execution ---")
  console.log(`Fiches a creer       : ${countToCreate}`)
  console.log(`Fiches a completer   : ${countToComplete}`)
  console.log(`Fiches inchanges     : ${countUnchanged}`)
  console.log(`Fiches ignorees      : ${ignoredRows.length}`)
  console.log(`Total fiches CSV     : ${allRows.length}\n`)

  const toCompleteActions = actions.filter((a) => a.type === 'COMPLETE')
  const unchangedWithEcarts = actions.filter(
    (a) => a.type === 'UNCHANGED' && a.ecarts && a.ecarts.length > 0
  )

  if (toCompleteActions.length > 0) {
    console.log(`--- Detail des fiches a completer (${toCompleteActions.length}) ---`)
    toCompleteActions.forEach((a) => {
      console.log(`[FICHE A COMPLETER] ${a.email} (ID: ${a.id})`)
      console.log('   * Champs qui seraient remplis :')
      Object.entries(a.updates).forEach(([k, v]) => {
        const displayVal = String(v).replace(/\n/g, ' \\n ')
        console.log(`       - ${k} : "${displayVal}"`)
      })
      if (a.ecarts && a.ecarts.length > 0) {
        console.log('   * Ecarts non corriges (conserves tels quels en base) :')
        a.ecarts.forEach((e) => {
          console.log(`       - ${e}`)
        })
      } else {
        console.log('   * Ecarts non corriges : aucun')
      }
    })
    console.log('')
  }

  if (unchangedWithEcarts.length > 0) {
    console.log(
      `--- Fiches inchanges mais avec ecarts detectes (${unchangedWithEcarts.length}) ---`
    )
    unchangedWithEcarts.forEach((a) => {
      console.log(`[INCHANGE AVEC ECARTS] ${a.email} (ID: ${a.id}) :`)
      a.ecarts.forEach((e) => {
        console.log(`   - ${e}`)
      })
    })
    console.log('')
  }

  if (!isWriteMode) {
    console.log("[SIMULATION TERMINEE] Rien n'a ete ecrit en base.")
    console.log('Pour appliquer reellement : node scripts/import-clients.js --write')
    return
  }

  // Execution en transaction unique
  console.log('Execution de la transaction atomique...')
  await prisma.$transaction(async (tx) => {
    for (const a of actions) {
      if (a.type === 'CREATE') {
        await tx.customer.create({ data: a.data })
      } else if (a.type === 'COMPLETE') {
        await tx.customer.update({
          where: { id: a.id },
          data: a.updates,
        })
      }
    }
  })

  console.log('\n[SUCCES] Import applique avec succes dans une transaction unique.')
  console.log(`Fiches creees     : ${countToCreate}`)
  console.log(`Fiches completees : ${countToComplete}`)
  console.log(`Fiches inchanges  : ${countUnchanged}`)
}

main()
  .catch((e) => {
    console.error("\n[ERREUR] La transaction a echoue, rien n'a ete ecrit :", e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
