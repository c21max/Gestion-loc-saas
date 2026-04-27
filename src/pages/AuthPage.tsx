import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, isDemoMode } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Building2 } from 'lucide-react'

export function AuthPage() {
  const navigate = useNavigate()
  const { loading: authLoading, session } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isDemoMode && !authLoading && session) {
      navigate('/', { replace: true })
    }
  }, [authLoading, navigate, session])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (isDemoMode) {
        navigate('/')
        return
      }

      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        if (!data.session) throw new Error('Connexion réussie, mais aucune session Supabase reçue.')
        navigate('/', { replace: true })
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setError('Vérifiez votre email pour confirmer votre compte.')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="soft-grid grid min-h-[100dvh] bg-slate-100 lg:grid-cols-[minmax(320px,430px)_1fr]">
      <div className="hidden flex-col justify-between bg-slate-950 p-8 lg:flex">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
            <Building2 className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-white">Gestion Locative</span>
        </div>

        <div className="max-w-[20rem]">
          <p className="text-3xl font-semibold leading-tight tracking-tight text-white">
            Du relevé bancaire<br />au décompte propriétaire.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Workflow mensuel complet pour les agences immobilières.
          </p>
        </div>

        <p className="text-xs text-slate-600">© {new Date().getFullYear()} Gestion Locative</p>
      </div>

      <div className="flex items-center justify-center p-4 sm:p-6">
        <div className="app-panel w-full max-w-md p-6 sm:p-8">
          <div className="mb-6">
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white lg:hidden">
              <Building2 className="h-5 w-5" />
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
              {mode === 'login' ? 'Connexion' : 'Créer un compte'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {mode === 'login' ? 'Accédez à votre espace agence.' : 'Commencez à utiliser la plateforme.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={6}
              />
            </div>

            {error && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Chargement…' : mode === 'login' ? 'Se connecter' : "S'inscrire"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-slate-500">
            {mode === 'login' ? (
              <>Pas encore de compte ?{' '}
                <button onClick={() => { setMode('signup'); setError(null) }} className="font-semibold text-emerald-800 underline underline-offset-2">
                  Créer un compte
                </button>
              </>
            ) : (
              <>Déjà un compte ?{' '}
                <button onClick={() => { setMode('login'); setError(null) }} className="font-semibold text-emerald-800 underline underline-offset-2">
                  Se connecter
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
