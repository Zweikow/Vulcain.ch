export const metadata = {
  title: 'Mentions Légales | Cidrerie du Vulcain',
  description: 'Mentions légales de la Cidrerie du Vulcain.',
}

export default function MentionsLegalesPage() {
  return (
    <>
      <h1>Mentions Légales</h1>
      <p className="text-sm text-text-tertiary">Dernière mise à jour : 14 août 2026</p>

      <h2 className="not-prose flex items-center gap-3 mt-12 mb-6 text-2xl font-display font-semibold text-text-primary dark:text-text-primary-dark pb-2 border-b border-border dark:border-border-dark">
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary-light dark:bg-secondary text-secondary dark:text-text-primary-dark text-sm font-bold shrink-0">
          1
        </span>
        <span>Éditeur du site</span>
      </h2>
      <p>Ce site internet est édité et géré par :</p>
      <p>
        <strong>Bertrand Baeriswyl</strong>
        <br />
        Distribution Cidrerie du Vulcain CH
        <br />
        Ch. Des Moilles 16
        <br />
        1619 Les Paccots
        <br />
        Suisse
      </p>
      <p>
        <strong>Forme juridique :</strong> Raison Individuelle
        <br />
        <strong>TVA / IDE :</strong> Non assujetti
        <br />
        <strong>Email :</strong>{' '}
        <a href="mailto:commandes@cidrerie-vulcain.ch">commandes@cidrerie-vulcain.ch</a>
      </p>

      <h2 className="not-prose flex items-center gap-3 mt-12 mb-6 text-2xl font-display font-semibold text-text-primary dark:text-text-primary-dark pb-2 border-b border-border dark:border-border-dark">
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary-light dark:bg-secondary text-secondary dark:text-text-primary-dark text-sm font-bold shrink-0">
          2
        </span>
        <span>Hébergement du site</span>
      </h2>
      <p>
        L&apos;hébergement de ce site est assuré par les services cloud d&apos;Amazon Web Services
        (AWS), via la plateforme SST.
      </p>
      <p>
        <strong>Amazon Web Services EMEA SARL</strong>
        <br />
        Datacenter : Europe (Zurich) – <em>eu-central-2</em>
        <br />
        38 Avenue John F. Kennedy
        <br />
        L-1855 Luxembourg
      </p>

      <h2 className="not-prose flex items-center gap-3 mt-12 mb-6 text-2xl font-display font-semibold text-text-primary dark:text-text-primary-dark pb-2 border-b border-border dark:border-border-dark">
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary-light dark:bg-secondary text-secondary dark:text-text-primary-dark text-sm font-bold shrink-0">
          3
        </span>
        <span>Propriété intellectuelle</span>
      </h2>
      <p>
        L&apos;ensemble du contenu de ce site (textes, images, logos, éléments graphiques) est la
        propriété exclusive de la Cidrerie du Vulcain, sauf mention contraire expresse. Toute
        reproduction, copie, modification, distribution ou utilisation à des fins commerciales sans
        l&apos;accord écrit préalable de la Cidrerie du Vulcain est strictement interdite.
      </p>

      <h2 className="not-prose flex items-center gap-3 mt-12 mb-6 text-2xl font-display font-semibold text-text-primary dark:text-text-primary-dark pb-2 border-b border-border dark:border-border-dark">
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary-light dark:bg-secondary text-secondary dark:text-text-primary-dark text-sm font-bold shrink-0">
          4
        </span>
        <span>Exclusion de responsabilité</span>
      </h2>
      <p>
        La Cidrerie du Vulcain s&apos;efforce de maintenir à jour et exactes les informations
        publiées sur ce site internet. Toutefois, elle ne peut garantir l&apos;exhaustivité,
        l&apos;exactitude ou l&apos;actualité des données fournies. La Cidrerie du Vulcain décline
        toute responsabilité pour d&apos;éventuels dommages directs ou indirects pouvant résulter de
        l&apos;accès à son site web ou de l&apos;utilisation de son contenu.
      </p>
      <p>
        Notre site peut contenir des liens vers des sites tiers. Nous n&apos;avons aucune influence
        sur le contenu ou la politique de confidentialité de ces sites et déclinons par conséquent
        toute responsabilité à leur égard.
      </p>
      <p>
        <strong>Consommation d&apos;alcool :</strong> L&apos;abus d&apos;alcool est dangereux pour
        la santé. La Cidrerie du Vulcain encourage une consommation responsable et modérée de ses
        produits. Elle décline toute responsabilité quant aux conséquences directes ou indirectes
        liées à une consommation excessive ou inappropriée des boissons vendues sur ce site.
      </p>
    </>
  )
}
