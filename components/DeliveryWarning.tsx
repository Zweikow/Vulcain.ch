export default function DeliveryWarning() {
  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 px-4 py-2">
      <p className="text-xs text-center text-amber-800 dark:text-amber-300">
        ⚠️ Livraison uniquement en Suisse — Les commandes sont préparées les lundis &amp; jeudis.
        Délai: 2–5 jours ouvrables.
      </p>
    </div>
  )
}
