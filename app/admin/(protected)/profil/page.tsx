import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { PasswordForm } from './PasswordForm'
import { ROLE_LABELS } from '@/lib/permissions'
import { Role } from '@prisma/client'

export default async function ProfilPage() {
  const session = await auth()
  if (!session?.user) redirect('/admin/login')

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-[26px] font-semibold text-text-primary dark:text-text-primary-dark mb-6">
        Mon Profil
      </h1>

      <div className="card p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Informations personnelles</h2>
        <div className="flex flex-col gap-2 text-sm">
          <p>
            <span className="text-text-tertiary w-32 inline-block">Nom d&apos;utilisateur</span>{' '}
            {session.user.name}
          </p>
          <p>
            <span className="text-text-tertiary w-32 inline-block">Rôle</span>{' '}
            {ROLE_LABELS[session.user.role as Role]}
          </p>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Changer de mot de passe</h2>
        <PasswordForm />
      </div>
    </div>
  )
}
