import { signIn } from '@/lib/auth'
import { AuthError } from 'next-auth'
import { redirect } from 'next/navigation'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  async function login(formData: FormData) {
    'use server'
    try {
      await signIn('credentials', {
        username: formData.get('username'),
        password: formData.get('password'),
        redirectTo: '/admin',
      })
    } catch (err) {
      if (err instanceof AuthError) {
        redirect('/admin/login?error=credentials')
      }
      throw err
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-page dark:bg-[#0B131D] relative overflow-hidden px-4">
      {/* Halo de fond HeroUI */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-primary/20 to-[#284B63]/20 rounded-full blur-3xl pointer-events-none opacity-60" />

      <div className="heroui-card p-8 sm:p-10 w-full max-w-md border border-divider shadow-heroui-lg rounded-3xl relative z-10">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-default-100 text-xs font-semibold text-default-600 border border-divider mb-3">
            <span className="w-2 h-2 rounded-full bg-primary" />
            Portail Gestion
          </div>
          <h1 className="font-display text-2xl font-bold text-text-primary dark:text-text-primary-dark">
            Drinkcider
          </h1>
          <p className="text-xs text-default-400 mt-1">Accès réservé aux administrateurs</p>
        </div>

        {error === 'credentials' && (
          <div
            role="alert"
            className="mb-5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-2xl text-center"
          >
            <p className="text-xs font-medium text-red-600 dark:text-red-400">
              Identifiant ou mot de passe incorrect.
            </p>
          </div>
        )}

        <form action={login} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="username"
              className="text-xs font-semibold text-default-600 dark:text-default-400"
            >
              Nom d&apos;utilisateur
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              className="heroui-input"
              placeholder="admin"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-xs font-semibold text-default-600 dark:text-default-400"
            >
              Mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="heroui-input"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="heroui-btn-primary w-full py-3.5 rounded-2xl mt-3 text-sm font-semibold shadow-heroui-primary"
          >
            Se connecter à l&apos;administration
          </button>
        </form>
      </div>
    </div>
  )
}
