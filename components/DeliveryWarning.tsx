export default function DeliveryWarning() {
  return (
    <div className="bg-default-100/70 dark:bg-default-50/70 border-b border-divider px-4 py-2 backdrop-blur-md">
      <div className="max-w-6xl mx-auto flex items-center justify-center gap-2 text-xs text-default-600 dark:text-default-400">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 text-[#153243] dark:text-primary font-semibold text-[10px]">
          Suisse
        </span>
        <span className="font-medium">
          Expéditions assurées chaque lundi &amp; jeudi · Délais postaux : 2–5 jours ouvrables.
        </span>
      </div>
    </div>
  )
}
