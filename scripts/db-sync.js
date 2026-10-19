/**
 * Aligne la base locale sur les migrations de la branche courante, pour
 * qu'une branche qui ajoute une table ne plante pas en local
 * (« The table ... does not exist in the current database »).
 *
 * Lancé avant `npm run dev` et par les hooks git post-checkout / post-merge.
 * À la main : npm run db:sync
 *
 * Uniquement `prisma migrate deploy` : applique les migrations en attente,
 * sans base fantôme ni remise à zéro. Et seulement sur une base du réseau
 * local : la base RDS est commune à dev, sandbox et prod, elle se migre à la
 * main, jamais au détour d'un `npm run dev`.
 *
 * N'échoue jamais : une base injoignable ne doit ni empêcher le serveur de
 * démarrer, ni faire échouer un checkout.
 */
const { spawnSync } = require('node:child_process')
const { loadEnvConfig } = require('@next/env')

// Mêmes fichiers .env que `next dev` : on migre la base que le serveur lira.
loadEnvConfig(process.cwd(), true, { info: () => {}, error: console.error })

const LOCAL_HOST =
  /^(localhost|127(\.\d+){3}|\[::1\]|10(\.\d+){3}|192\.168(\.\d+){2}|172\.(1[6-9]|2\d|3[01])(\.\d+){2}|[\w-]+\.local)$/

function hostOf(url) {
  try {
    return new URL(url).hostname
  } catch {
    return null
  }
}

function prisma(...args) {
  const run = spawnSync('npx', ['prisma', ...args], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, PRISMA_HIDE_UPDATE_MESSAGE: '1' },
  })
  return run.status === 0
}

const host = hostOf(process.env.DATABASE_URL ?? '')

if (!host) {
  console.warn('[db-sync] DATABASE_URL absente ou illisible : rien à synchroniser.')
} else if (!LOCAL_HOST.test(host)) {
  console.warn(`[db-sync] Base distante (${host}) : migrations à appliquer à la main.`)
} else {
  if (!prisma('migrate', 'deploy')) {
    console.warn('[db-sync] Migrations non appliquées (base injoignable ?). On continue.')
  }
  if (!prisma('generate', '--no-hints')) {
    console.warn(
      '[db-sync] Client Prisma non régénéré (serveur déjà lancé ?). Relancez `npm run dev`.'
    )
  }
}
