export const metadata = {
  title: 'Notre Histoire - Cidrerie de Vulcain',
  description: "Découvrez l'histoire de la Cidrerie de Vulcain",
}

export default function HistoirePage() {
  return (
    <div className="min-h-screen pt-24 px-4 max-w-3xl mx-auto">
      <h1 className="font-display font-semibold text-4xl text-text-primary dark:text-text-primary-dark mb-8">
        Notre Histoire
      </h1>

      <div className="prose dark:prose-invert">
        <p className="text-lg text-text-secondary dark:text-text-secondary-dark leading-relaxed">
          Cette page est en cours de rédaction.
        </p>
        <p className="text-text-secondary dark:text-text-secondary-dark mt-4">
          Nous y raconterons prochainement l&apos;histoire du domaine, nos méthodes artisanales, et
          la passion qui anime la Cidrerie de Vulcain depuis ses débuts.
        </p>
      </div>
    </div>
  )
}
