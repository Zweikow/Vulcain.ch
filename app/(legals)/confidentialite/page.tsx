export const metadata = {
  title: 'Protection des Données | Cidrerie du Vulcain',
  description: 'Politique de protection des données (nLPD) de la Cidrerie du Vulcain.',
}

export default function ConfidentialitePage() {
  return (
    <>
      <h1>Déclaration de Protection des Données</h1>
      <p className="text-sm text-text-tertiary">Dernière mise à jour : 14 août 2026</p>

      <p>
        La Cidrerie du Vulcain attache une grande importance à la protection de vos données
        personnelles. La présente déclaration explique de quelle manière et à quelles fins nous
        collectons, traitons et utilisons vos données personnelles, conformément à la Loi fédérale
        sur la protection des données (nLPD) en Suisse.
      </p>

      <h2 className="not-prose flex items-center gap-3 mt-12 mb-6 text-2xl font-display font-semibold text-text-primary dark:text-text-primary-dark pb-2 border-b border-border dark:border-border-dark">
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary-light dark:bg-secondary text-secondary dark:text-text-primary-dark text-sm font-bold shrink-0">
          1
        </span>
        <span>Données collectées</span>
      </h2>
      <p>
        Dans le cadre de l&apos;utilisation de notre site web et particulièrement lors de la
        commande de nos produits, nous collectons les données strictement nécessaires à
        l&apos;exécution du contrat :
      </p>
      <ul>
        <li>Prénom, nom ou raison sociale</li>
        <li>Adresse de livraison et de facturation (rue, NPA, localité)</li>
        <li>Adresse e-mail (pour l&apos;envoi de la facture et le suivi de commande)</li>
        <li>Numéro de téléphone (optionnel, uniquement pour faciliter la livraison)</li>
      </ul>

      <h2 className="not-prose flex items-center gap-3 mt-12 mb-6 text-2xl font-display font-semibold text-text-primary dark:text-text-primary-dark pb-2 border-b border-border dark:border-border-dark">
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary-light dark:bg-secondary text-secondary dark:text-text-primary-dark text-sm font-bold shrink-0">
          2
        </span>
        <span>Finalité du traitement</span>
      </h2>
      <p>Vos données sont traitées exclusivement pour les finalités suivantes :</p>
      <ul>
        <li>La gestion et le traitement de vos commandes et factures.</li>
        <li>La livraison de la marchandise.</li>
        <li>La communication avec vous en cas de question relative à votre commande.</li>
        <li>
          L&apos;envoi d&apos;informations occasionnelles concernant nos nouveaux produits ou offres
          (uniquement à nos clients existants, avec possibilité de se désinscrire à tout moment).
        </li>
      </ul>
      <p>
        Nous ne pratiquons <strong>aucun profilage automatisé</strong> et nous ne vendons ni ne
        louons jamais vos données à des tiers.
      </p>

      <h2 className="not-prose flex items-center gap-3 mt-12 mb-6 text-2xl font-display font-semibold text-text-primary dark:text-text-primary-dark pb-2 border-b border-border dark:border-border-dark">
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary-light dark:bg-secondary text-secondary dark:text-text-primary-dark text-sm font-bold shrink-0">
          3
        </span>
        <span>Partage des données à des tiers</span>
      </h2>
      <p>
        Nous transmettons vos données personnelles à des prestataires de services tiers uniquement
        dans la mesure où cela est nécessaire à l&apos;exécution de votre commande (par exemple, le
        service postal ou un transporteur pour acheminer votre colis). Ces prestataires sont
        eux-mêmes tenus au respect de la protection des données.
      </p>

      <h2 className="not-prose flex items-center gap-3 mt-12 mb-6 text-2xl font-display font-semibold text-text-primary dark:text-text-primary-dark pb-2 border-b border-border dark:border-border-dark">
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary-light dark:bg-secondary text-secondary dark:text-text-primary-dark text-sm font-bold shrink-0">
          4
        </span>
        <span>Hébergement et sécurité</span>
      </h2>
      <p>
        Notre site est hébergé sur des serveurs sécurisés situés en Suisse (Datacenter AWS à
        Zurich). Nous prenons les mesures techniques et organisationnelles appropriées pour protéger
        vos données personnelles contre la perte, la destruction, la falsification ou l&apos;accès
        non autorisé.
      </p>

      <h2 className="not-prose flex items-center gap-3 mt-12 mb-6 text-2xl font-display font-semibold text-text-primary dark:text-text-primary-dark pb-2 border-b border-border dark:border-border-dark">
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary-light dark:bg-secondary text-secondary dark:text-text-primary-dark text-sm font-bold shrink-0">
          5
        </span>
        <span>Durée de conservation</span>
      </h2>
      <p>
        Nous conservons vos données personnelles aussi longtemps que nécessaire pour atteindre le
        but pour lequel elles ont été collectées, et dans le respect de nos obligations légales de
        conservation (par exemple, la conservation des documents comptables pour une durée légale de
        10 ans).
      </p>

      <h2 className="not-prose flex items-center gap-3 mt-12 mb-6 text-2xl font-display font-semibold text-text-primary dark:text-text-primary-dark pb-2 border-b border-border dark:border-border-dark">
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary-light dark:bg-secondary text-secondary dark:text-text-primary-dark text-sm font-bold shrink-0">
          6
        </span>
        <span>Vos droits</span>
      </h2>
      <p>
        Conformément à la nLPD, vous disposez d&apos;un droit d&apos;accès, de rectification,
        d&apos;effacement et de limitation du traitement de vos données personnelles. Pour exercer
        ces droits ou pour toute question concernant la protection de vos données, vous pouvez nous
        contacter à l&apos;adresse suivante :
      </p>
      <p>
        <strong>E-mail :</strong>{' '}
        <a href="mailto:commandes@cidrerie-vulcain.ch">commandes@cidrerie-vulcain.ch</a>
        <br />
        <strong>Adresse postale :</strong> Bertrand Baeriswyl, Distribution Cidrerie du Vulcain CH,
        Chemin des Moilles 16, 1619 Les Paccots
      </p>
    </>
  )
}
