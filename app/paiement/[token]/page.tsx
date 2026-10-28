import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { OrderStatus, PaymentMode } from '@prisma/client'
import { AlertCircle, CheckCircle2, Clock3, CreditCard, ShieldCheck, XCircle } from 'lucide-react'
import Header from '@/components/Header'
import { Button } from '@/components/ui/button'
import { PaymentAutoRefresh } from '@/components/PaymentAutoRefresh'
import { prisma } from '@/lib/prisma'
import { formatCHF } from '@/lib/money'
import { getSettings } from '@/lib/settings'
import { isSettlingTransactionState } from '@/lib/payments/states'

// Page personnelle : lue en base à chaque visite, jamais indexée
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Paiement de votre commande',
  robots: { index: false, follow: false },
}

type View = 'payee' | 'annulee' | 'enregistree' | 'confirmation' | 'echec' | 'refusee' | 'a_payer'

const NOTICES: Record<string, string> = {
  indisponible:
    'Le paiement en ligne est momentanément indisponible. Votre commande est conservée : réessayez plus tard ou contactez-nous.',
  erreur: "PostFinance n'a pas pu ouvrir la page de paiement. Réessayez dans un instant.",
  trop_de_tentatives: 'Trop de tentatives en peu de temps. Réessayez dans quelques minutes.',
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

  const [order, settings] = await Promise.all([
    prisma.order.findUnique({
      where: { paymentToken: token },
      select: {
        numero: true,
        status: true,
        paymentMode: true,
        paidAt: true,
        totalCents: true,
        items: { select: { productName: true, quantity: true, unitPriceCents: true } },
        paymentTransactions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { state: true },
        },
      },
    }),
    getSettings(),
  ])
  if (!order) notFound()

  const latestState = order.paymentTransactions[0]?.state ?? null
  const failed = latestState === 'FAILED' || latestState === 'VOIDED'

  let view: View
  if (order.paidAt) view = 'payee'
  else if (order.status === OrderStatus.ANNULEE) view = 'annulee'
  else if (
    order.paymentMode !== PaymentMode.EN_LIGNE ||
    order.status !== OrderStatus.EN_ATTENTE_PAIEMENT
  )
    view = 'enregistree'
  else if (motif === 'refusee' || latestState === 'DECLINE') view = 'refusee'
  else if (motif === 'en_cours' || (latestState && isSettlingTransactionState(latestState)))
    view = 'confirmation'
  else if (retour === 'succes' && !failed) view = 'confirmation'
  else if (retour === 'echec' || failed) view = 'echec'
  else view = 'a_payer'

  const notice = motif ? NOTICES[motif] : undefined
  const canPay = view === 'a_payer' || view === 'echec'

  return (
    <div className="min-h-screen bg-bg-page dark:bg-bg-page-dark flex flex-col">
      <Header />
      <main className="flex-1 w-full max-w-xl mx-auto px-4 py-10 sm:py-14">
        <div className="card p-6 sm:p-8 flex flex-col gap-6">
          <ViewHeader view={view} numero={order.numero} contactEmail={settings.contactEmail} />

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
                <li key={i} className="flex justify-between gap-4 px-4 py-2.5">
                  <span className="text-text-primary dark:text-text-primary-dark">
                    {item.quantity} × {item.productName}
                  </span>
                  <span className="tabular text-text-secondary dark:text-text-secondary-dark shrink-0">
                    {formatCHF(item.unitPriceCents * item.quantity)}
                  </span>
                </li>
              ))}
              <li className="flex justify-between gap-4 px-4 py-3 font-semibold text-text-primary dark:text-text-primary-dark">
                <span>Total</span>
                <span className="tabular">{formatCHF(order.totalCents)}</span>
              </li>
            </ul>
          </section>

          {canPay && (
            <form method="post" action={`/api/paiement/${token}`} className="flex flex-col gap-3">
              <Button type="submit" size="lg" className="w-full font-semibold">
                <CreditCard className="w-4 h-4 mr-2 shrink-0" />
                {view === 'echec' ? 'Réessayer le paiement' : 'Payer'}{' '}
                <span className="tabular ml-1">{formatCHF(order.totalCents)}</span>
              </Button>
              <p className="flex items-center justify-center gap-1.5 text-xs text-text-secondary dark:text-text-secondary-dark">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                Paiement sécurisé par PostFinance : carte, PostFinance Card, PostFinance Pay ou
                TWINT
              </p>
            </form>
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

function ViewHeader({
  view,
  numero,
  contactEmail,
}: {
  view: View
  numero: string
  contactEmail: string
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
