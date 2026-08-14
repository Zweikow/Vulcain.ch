'use client'

/**
 * Champ numérique dont le contenu se sélectionne à la prise de focus : taper
 * remplace la valeur au lieu de s'ajouter devant. Sans cela, un champ affichant
 * « 0 » donne « 01500 » dès qu'on saisit un montant, ce qui oblige à effacer le
 * zéro à chaque fois — pénible en saisie répétée.
 *
 * Composant client : un gestionnaire d'événement ne peut pas vivre dans un
 * composant serveur, ce qu'est l'écran Paramètres.
 */
export function NumberField(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="number"
      {...props}
      onFocus={(e) => {
        e.target.select()
        props.onFocus?.(e)
      }}
    />
  )
}
