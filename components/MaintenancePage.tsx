import Image from 'next/image'
import Link from 'next/link'
import { Wrench } from 'lucide-react'

/** Vitrine affichée à la place du catalogue quand l'admin ferme la boutique. */
export default function MaintenancePage({ contactEmail }: { contactEmail: string }) {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-16">
      <div className="card w-full max-w-md p-8 text-center flex flex-col items-center gap-5">
        <Image
          src="/images/logo-drinkcider.svg"
          alt="Drinkcider"
          width={72}
          height={72}
          className="w-[72px] h-[72px] rounded-full"
          priority
        />
        <div className="w-10 h-10 rounded-full bg-primary/15 text-primary-text flex items-center justify-center">
          <Wrench className="w-5 h-5" />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="font-display font-bold text-2xl text-foreground">
            Boutique momentanément fermée
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Drinkcider est en cours de maintenance. Les commandes sont suspendues pour le moment :
            merci de revenir un peu plus tard.
          </p>
        </div>
        {contactEmail && (
          <p className="text-sm text-muted-foreground">
            Une question ? Écrivez-nous à{' '}
            <a
              href={`mailto:${contactEmail}`}
              className="font-medium text-primary-text underline underline-offset-2"
            >
              {contactEmail}
            </a>
          </p>
        )}
      </div>
    </main>
  )
}
