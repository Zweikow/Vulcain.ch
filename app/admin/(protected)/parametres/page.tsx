import { getSettings } from '@/lib/settings'
import { formatCHF, proUnitPriceCents } from '@/lib/money'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { requireAdmin } from '@/lib/guards'
import { PasswordChange } from '@/components/admin/PasswordChange'
import { NumberField } from '@/components/admin/NumberField'
import { saveSettings } from './actions'

const EXAMPLE_PRICE_CENTS = 2400

export default async function ParametresPage() {
  // Tarifs, IBAN et facturation ne concernent pas un préparateur.
  await requireAdmin()
  const [s, session] = await Promise.all([getSettings(), auth()])
  const account = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { username: true },
      })
    : null

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="font-display font-semibold text-[26px] text-text-primary dark:text-text-primary-dark">
          Paramètres
        </h1>
        <p className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">
          Tout se répercute immédiatement sur la boutique, le catalogue et les factures.
        </p>
      </div>

      <form action={saveSettings} className="flex flex-col gap-4">
        {/* Tarifs professionnels */}
        <section className="card p-6">
          <h2 className="font-semibold text-[16px] text-accent-mauve-dark dark:text-accent-mauve">
            Tarifs professionnels
          </h2>
          <label className="mt-4 block text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
            Remise pro (% du prix public)
            <NumberField
              name="proRatePercent"

              min={0}
              max={90}
              defaultValue={s.proRatePercent}
              className="input-field mt-1"
            />
          </label>
          <p className="mt-2 text-xs text-text-tertiary dark:text-text-tertiary-dark">
            Exemple : une bouteille à {formatCHF(EXAMPLE_PRICE_CENTS)} passe à{' '}
            {formatCHF(proUnitPriceCents(EXAMPLE_PRICE_CENTS, s.proRatePercent))} au taux actuel.
          </p>
        </section>

        {/* Livraison */}
        <section className="card p-6">
          <h2 className="font-semibold text-[16px] text-text-primary dark:text-text-primary-dark">
            Livraison
          </h2>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
              Port (centimes)
              <NumberField
                name="shippingCents"

                min={0}
                defaultValue={s.shippingCents}
                className="input-field mt-1 tabular"
              />
            </label>
            <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
              Franco dès (centimes)
              <NumberField
                name="francoCents"

                min={0}
                defaultValue={s.francoCents}
                className="input-field mt-1 tabular"
              />
            </label>
            <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
              Jours de préparation
              <NumberField
                name="prepDays"

                min={0}
                defaultValue={s.prepDays}
                className="input-field mt-1 tabular"
              />
            </label>
          </div>
          <p className="mt-2 text-xs text-text-tertiary dark:text-text-tertiary-dark">
            Port actuel {formatCHF(s.shippingCents)}, offert dès {formatCHF(s.francoCents)}{' '}
            d&apos;achat et pour les clients professionnels.
          </p>
        </section>

        {/* Facturation */}
        <section className="card p-6">
          <h2 className="font-semibold text-[16px] text-text-primary dark:text-text-primary-dark">
            Facturation
          </h2>
          <p className="mt-1 text-xs text-text-tertiary dark:text-text-tertiary-dark">
            Ces informations composent l&apos;en-tête et le pied de la facture imprimée.
          </p>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
              Nom du signataire
              <input name="contactName" defaultValue={s.contactName} className="input-field mt-1" />
            </label>
            <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
              Ligne d&apos;activité
              <input
                name="companyTagline"
                defaultValue={s.companyTagline}
                className="input-field mt-1"
              />
            </label>
            <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
              NPA et localité
              <input
                name="companyZipCity"
                defaultValue={s.companyZipCity}
                className="input-field mt-1"
              />
            </label>
            <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
              Lieu d&apos;émission
              <input
                name="invoicePlace"
                defaultValue={s.invoicePlace}
                className="input-field mt-1"
              />
            </label>
            <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
              Banque
              <input name="bankName" defaultValue={s.bankName} className="input-field mt-1" />
            </label>
            <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
              Délai de paiement (jours)
              <NumberField
                name="paymentTermsDays"

                min={0}
                max={180}
                defaultValue={s.paymentTermsDays}
                className="input-field mt-1 tabular"
              />
            </label>
            <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
              Raison sociale
              <input name="companyName" defaultValue={s.companyName} className="input-field mt-1" />
            </label>
            <label className="flex items-start gap-2 text-xs font-medium text-text-secondary dark:text-text-secondary-dark sm:col-span-2">
              <input
                type="checkbox"
                name="vatSubject"
                defaultChecked={s.vatSubject}
                className="mt-0.5"
              />
              <span>
                Assujettie à la TVA
                <span className="block font-normal text-text-tertiary dark:text-text-tertiary-dark">
                  À cocher seulement à partir de 100 000 CHF de chiffre d&apos;affaires annuel.
                  Décochée, aucune TVA n&apos;est facturée ni mentionnée sur les documents — faire
                  état d&apos;une TVA qu&apos;on ne perçoit pas n&apos;est pas permis.
                </span>
              </span>
            </label>
            <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
              Numéro de TVA
              <input
                name="vatNumber"
                defaultValue={s.vatNumber}
                placeholder="CHE-123.456.789 TVA"
                className="input-field mt-1 font-mono"
              />
            </label>
            <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
              Taux de TVA (pour-mille, 81 = 8.1%)
              <NumberField
                name="vatRatePermille"

                min={0}
                max={999}
                defaultValue={s.vatRatePermille}
                className="input-field mt-1 tabular"
              />
            </label>
            <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
              IBAN
              <input name="iban" defaultValue={s.iban} className="input-field mt-1 font-mono" />
            </label>
            <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark sm:col-span-2">
              Adresse
              <input
                name="companyAddress"
                defaultValue={s.companyAddress}
                className="input-field mt-1"
              />
            </label>
            <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
              Email de contact
              <input
                name="contactEmail"
                defaultValue={s.contactEmail}
                className="input-field mt-1"
              />
            </label>
            <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
              Téléphone
              <input
                name="contactPhone"
                defaultValue={s.contactPhone}
                className="input-field mt-1"
              />
            </label>
          </div>
        </section>

        <div className="flex justify-end">
          <button className="btn-primary">Enregistrer les paramètres</button>
        </div>
      </form>

      {/* Formulaire distinct : le mot de passe ne s'enregistre pas avec le reste */}
      {account && (
        <div className="mt-4">
          <PasswordChange username={account.username} />
        </div>
      )}
    </div>
  )
}
