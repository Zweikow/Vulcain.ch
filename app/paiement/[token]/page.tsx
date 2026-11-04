import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { OrderStatus, PaymentMode } from '@prisma/client'
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import Header from '@/components/Header'
import { Button } from '@/components/ui/button'
import { PaymentAutoRefresh } from '@/components/PaymentAutoRefresh'
import { prisma } from '@/lib/prisma'
import { formatCHF, invoiceFeeCentsFor } from '@/lib/money'
import { getSettings } from '@/lib/settings'
import { isSettlingTransactionState } from '@/lib/payments/states'
import { PAYMENT_CHOICE_LABELS } from '@/lib/payments/choices'
import { availablePaymentChoices, isModeChoiceEnabled } from '@/lib/payments/modes'
import { markInvoiceUnavailable } from '@/lib/payments/checkout'

// Page personnelle : lue en base à chaque visite, jamais indexée
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Paiement de votre commande',
  robots: { index: false, follow: false },
}

type View =
  | 'payee'
  | 'acceptee'
  | 'a_verifier'
  | 'annulee'
  | 'enregistree'
  | 'confirmation'
  | 'echec'
  | 'facture_refusee'
  | 'refusee'
  | 'a_payer'

const NOTICES: Record<string, string> = {
  indisponible:
    'Le paiement en ligne est momentanément indisponible. Votre commande est conservée : réessayez plus tard ou contactez-nous.',
  erreur: "PostFinance n'a pas pu ouvrir la page de paiement. Réessayez dans un instant.",
  trop_de_tentatives: 'Trop de tentatives en peu de temps. Réessayez dans quelques minutes.',
  mode_indisponible:
    "Ce mode de paiement n'est pas disponible pour cette commande. Choisissez-en un autre.",
}

const TOKEN = /^[A-Za-z0-9_-]{32}$/

export default async function PaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ retour?: string; motif?: string }>
}) {
  const [{ token }, { retour, motif }] = await Promise.all([params, searchParams])
  if (!TOKEN.test(token)) notFound()

  const findOrder = () =>
    prisma.order.findUnique({
      where: { paymentToken: token },
      select: {
        id: true,
        numero: true,
        status: true,
        paymentMode: true,
        paidAt: true,
        invoiceAcceptedAt: true,
        invoiceUnavailable: true,
        paymentChoice: true,
        invoiceFeeCents: true,
        promoCode: true,
        promoDiscountCents: true,
        shippingCents: true,
        totalCents: true,
        items: { select: { productName: true, quantity: true, unitPriceCents: true } },
        // Transaction active : la plus récente qui n'a pas été remplacée
        paymentTransactions: {
          where: { supersededAt: null },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { state: true },
        },
      },
    })
  const [found, settings] = await Promise.all([findOrder(), getSettings()])
  if (!found) notFound()
  let order = found

  // Retour en échec d'une tentative par facture : refus de solvabilité ou
  // abandon, indiscernables chez PostFinance. La facture est retirée pour cette
  // commande (le webhook d'échec fait de même) : cela ne fait que retirer une
  // option, jamais payer.
  if (retour === 'echec' && order.paymentChoice === 'FACTURE' && !order.invoiceUnavailable) {
    if (await markInvoiceUnavailable(order.id)) order = (await findOrder()) ?? order
  }

  const latestState = order.paymentTransactions[0]?.state ?? null
  const failed = latestState === 'FAILED' || latestState === 'VOIDED'
  const pending =
    order.paymentMode === PaymentMode.EN_LIGNE && order.status === OrderStatus.EN_ATTENTE_PAIEMENT
  const invoiceRefused = pending && order.paymentChoice === 'FACTURE' && order.invoiceUnavailable

  let view: View
  if (order.invoiceAcceptedAt) view = 'acceptee'
  else if (order.paidAt) view = 'payee'
  else if (order.status === OrderStatus.ANNULEE) view = 'annulee'
  else if (order.status === OrderStatus.A_VERIFIER) view = 'a_verifier'
  else if (!pending) view = 'enregistree'
  else if (invoiceRefused) view = 'facture_refusee'
  else if (motif === 'refusee' || latestState === 'DECLINE') view = 'refusee'
  else if (motif === 'en_cours' || (latestState && isSettlingTransactionState(latestState)))
    view = 'confirmation'
  else if (retour === 'succes' && !failed) view = 'confirmation'
  else if (retour === 'echec' || failed) view = 'echec'
  else view = 'a_payer'

  const notice = motif ? NOTICES[motif] : undefined
  const canPay = view === 'a_payer' || view === 'echec' || view === 'facture_refusee'
  // Choix du mode (lot B) : modes encore proposés pour cette commande
  const choices =
    canPay && isModeChoiceEnabled()
      ? availablePaymentChoices({ invoiceUnavailable: order.invoiceUnavailable })
      : []
  const currentChoice = order.paymentChoice
  const currentStillAvailable = currentChoice
    ? choices.includes(currentChoice)
    : choices.length === 0

  return (
    <div className="min-h-screen bg-bg-page dark:bg-bg-page-dark flex flex-col">
      <Header />
      <main className="flex-1 w-full max-w-xl mx-auto px-4 py-10 sm:py-14">
        <div className="card p-6 sm:p-8 flex flex-col gap-6">
          <ViewHeader
            view={view}
            numero={order.numero}
            contactEmail={settings.contactEmail}
            invoiceFeeCents={order.invoiceFeeCents}
          />

          {view === 'confirmation' && <PaymentAutoRefresh />}

          {notice && canPay && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-border dark:border-border-dark bg-bg-page dark:bg-bg-page-dark p-3 text-sm text-text-primary dark:text-text-primary-dark"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-text-warning" />
              <span>{notice}</span>
            </p>
          )}

          <section
            aria-label="Récapitulatif"
            className="rounded-xl border border-border dark:border-border-dark"
          >
            <ul className="divide-y divide-border dark:divide-border-dark text-sm">
              {order.items.map((item, i) => (
                <SummaryLine
                  key={i}
                  label={`${item.quantity} × ${item.productName}`}
                  cents={item.unitPriceCents * item.quantity}
                />
              ))}
              {order.promoDiscountCents > 0 && (
                <SummaryLine
                  label={order.promoCode ? `Code promo ${order.promoCode}` : 'Code promo'}
                  cents={-order.promoDiscountCents}
                />
              )}
              {order.shippingCents > 0 && (
                <SummaryLine label="Frais de port" cents={order.shippingCents} />
              )}
              {order.invoiceFeeCents > 0 && (
                <SummaryLine label="Supplément facture" cents={order.invoiceFeeCents} />
              )}
              <li className="flex justify-between gap-4 px-4 py-3 font-semibold text-text-primary dark:text-text-primary-dark">
                <span>Total</span>
                <span className="tabular">{formatCHF(order.totalCents)}</span>
              </li>
            </ul>
            {currentChoice && (
              <p className="px-4 pb-3 text-xs text-text-secondary dark:text-text-secondary-dark">
                Mode de paiement choisi : {PAYMENT_CHOICE_LABELS[currentChoice]}
              </p>
            )}
          </section>

          {canPay && currentStillAvailable && (
            <form method="post" action={`/api/paiement/${token}`} className="flex flex-col gap-3">
              <Button type="submit" size="lg" className="w-full font-semibold">
                <CreditCard className="w-4 h-4 mr-2 shrink-0" />
                {view === 'echec' ? 'Réessayer le paiement' : 'Payer'}{' '}
                <span className="tabular ml-1">{formatCHF(order.totalCents)}</span>
              </Button>
              <p className="flex items-center justify-center gap-1.5 text-xs text-text-secondary dark:text-text-secondary-dark">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                {currentChoice
                  ? 'Paiement sécurisé par PostFinance'
                  : 'Paiement sécurisé par PostFinance : carte, PostFinance Card, PostFinance Pay ou TWINT'}
              </p>
            </form>
          )}

          {choices.length > 0 && (
            <ChangeModeForm
              token={token}
              choices={choices}
              current={currentStillAvailable ? currentChoice : null}
              invoiceFeeCents={invoiceFeeCentsFor('FACTURE', settings)}
              open={!currentStillAvailable}
            />
          )}

          <Link
            href="/"
            className="text-center text-sm font-medium text-text-secondary hover:text-text-primary dark:text-text-secondary-dark dark:hover:text-text-primary-dark"
          >
            Retour à la boutique
          </Link>
        </div>
      </main>
    </div>
  )
}

function SummaryLine({ label, cents }: { label: string; cents: number }) {
  return (
    <li className="flex justify-between gap-4 px-4 py-2.5">
      <span className="text-text-primary dark:text-text-primary-dark">{label}</span>
      <span className="tabular text-text-secondary dark:text-text-secondary-dark shrink-0">
        {formatCHF(cents)}
      </span>
    </li>
  )
}

/**
 * Changement de mode : simple formulaire HTML, le serveur valide le mode,
 * recalcule le total et ouvre une nouvelle transaction limitée à ce mode.
 */
function ChangeModeForm({
  token,
  choices,
  current,
  invoiceFeeCents,
  open,
}: {
  token: string
  choices: (keyof typeof PAYMENT_CHOICE_LABELS)[]
  current: keyof typeof PAYMENT_CHOICE_LABELS | null
  invoiceFeeCents: number
  open: boolean
}) {
  const form = (
    <form method="post" action={`/api/paiement/${token}/mode`} className="flex flex-col gap-2 pt-3">
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">Mode de paiement</legend>
        {choices.map((choice) => (
          <label
            key={choice}
            className="flex items-center gap-3 rounded-lg border border-border dark:border-border-dark px-3 py-2.5 text-sm cursor-pointer has-[:checked]:border-primary"
          >
            <input
              type="radio"
              name="paymentChoice"
              value={choice}
              required
              defaultChecked={choice === current}
              className="accent-primary"
            />
            <span className="flex-1 text-text-primary dark:text-text-primary-dark">
              {PAYMENT_CHOICE_LABELS[choice]}
            </span>
            {choice === 'FACTURE' && invoiceFeeCents > 0 && (
              <span className="tabular text-xs text-text-secondary dark:text-text-secondary-dark">
                + {formatCHF(invoiceFeeCents)}
              </span>
            )}
          </label>
        ))}
      </fieldset>
      <Button type="submit" size="lg" variant="outline" className="w-full font-semibold mt-1">
        Payer avec ce mode
      </Button>
    </form>
  )
  if (open) {
    return (
      <section aria-label="Choisir un autre mode de paiement" className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
          Choisissez un autre mode de paiement
        </h2>
        {form}
      </section>
    )
  }
  return (
    <details className="group">
      <summary className="cursor-pointer text-center text-sm font-medium text-text-secondary hover:text-text-primary dark:text-text-secondary-dark dark:hover:text-text-primary-dark">
        Changer de mode de paiement
      </summary>
      {form}
    </details>
  )
}

function ViewHeader({
  view,
  numero,
  contactEmail,
  invoiceFeeCents,
}: {
  view: View
  numero: string
  contactEmail: string
  invoiceFeeCents: number
}) {
  const reference = <span className="font-mono font-semibold">{numero}</span>
  const content: Record<View, { icon: React.ReactNode; title: string; text: React.ReactNode }> = {
    payee: {
      icon: <CheckCircle2 className="w-7 h-7 text-text-success" />,
      title: 'Paiement reçu',
      text: (
        <>
          Merci, votre commande {reference} est confirmée. Un email de confirmation vous a été
          envoyé.
        </>
      ),
    },
    acceptee: {
      icon: <FileText className="w-7 h-7 text-text-success" />,
      title: 'Commande acceptée sur facture',
      text: (
        <>
          Merci, votre commande {reference} est confirmée. MF Group vous enverra sa facture PowerPay
          en fin de mois ; elle se règle auprès de MF Group.
        </>
      ),
    },
    a_verifier: {
      icon: <Clock3 className="w-7 h-7 text-text-warning" />,
      title: 'Paiement en cours de vérification',
      text: (
        <>
          Nous vérifions le paiement de la commande {reference} et revenons vers vous si nécessaire.
          Pour toute question, écrivez-nous à {contactEmail}.
        </>
      ),
    },
    confirmation: {
      icon: <Clock3 className="w-7 h-7 text-text-warning" />,
      title: 'Paiement en cours de confirmation',
      text: (
        <>
          PostFinance nous transmet la confirmation de votre paiement pour la commande {reference}.
          Cette page se met à jour toute seule ; vous recevrez aussi un email.
        </>
      ),
    },
    echec: {
      icon: <XCircle className="w-7 h-7 text-text-error" />,
      title: "Le paiement n'a pas abouti",
      text: (
        <>
          Votre paiement n&apos;a pas été effectué. La commande {reference} est conservée : vous
          pouvez réessayer, avec le même moyen de paiement ou un autre.
        </>
      ),
    },
    facture_refusee: {
      icon: <XCircle className="w-7 h-7 text-text-error" />,
      title: "Le paiement par facture n'a pas abouti",
      text: (
        <>
          La facture n&apos;est pas disponible pour la commande {reference}, qui reste conservée.
          Choisissez un autre mode de paiement
          {invoiceFeeCents > 0 ? (
            <>
              {' '}
              : le supplément de <span className="tabular">{formatCHF(invoiceFeeCents)}</span>{' '}
              disparaît du total dès que vous l&apos;avez choisi.
            </>
          ) : (
            '.'
          )}
        </>
      ),
    },
    refusee: {
      icon: <AlertCircle className="w-7 h-7 text-text-error" />,
      title: "Le paiement n'a pas pu être accepté",
      text: (
        <>
          Merci de nous contacter à {contactEmail} en indiquant la commande {reference} : nous
          trouverons une solution avec vous.
        </>
      ),
    },
    a_payer: {
      icon: <CreditCard className="w-7 h-7 text-primary-text" />,
      title: 'Commande en attente de paiement',
      text: (
        <>
          Votre commande {reference} est enregistrée. Elle sera préparée dès réception de votre
          paiement.
        </>
      ),
    },
    annulee: {
      icon: <XCircle className="w-7 h-7 text-text-secondary" />,
      title: 'Commande annulée',
      text: (
        <>
          La commande {reference} a été annulée. Pour toute question, écrivez-nous à {contactEmail}.
        </>
      ),
    },
    enregistree: {
      icon: <CheckCircle2 className="w-7 h-7 text-text-success" />,
      title: 'Commande enregistrée',
      text: (
        <>Votre commande {reference} est enregistrée. Aucun paiement en ligne n&apos;est requis.</>
      ),
    },
  }
  const { icon, title, text } = content[view]
  return (
    <div className="flex flex-col items-center text-center gap-3">
      {icon}
      <h1 className="font-display text-2xl font-semibold text-text-primary dark:text-text-primary-dark">
        {title}
      </h1>
      <p className="text-sm leading-relaxed text-text-secondary dark:text-text-secondary-dark">
        {text}
      </p>
    </div>
  )
}
