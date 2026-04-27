import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Building2 } from 'lucide-react'
import { supabase, isDemoMode } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function getOnboardingErrorMessage(err: unknown) {
  if (err && typeof err === 'object') {
    const supabaseError = err as { code?: string; message?: string; details?: string; hint?: string }

    if (supabaseError.code === 'PGRST202' || supabaseError.code === 'PGRST205') {
      return "La migration Supabase multi-tenant n'est pas appliquée. Lancez la migration 20240003_multi_tenant.sql dans Supabase, puis réessayez."
    }

    return supabaseError.message ?? supabaseError.details ?? supabaseError.hint ?? "Impossible de créer l'agence"
  }

  return err instanceof Error ? err.message : "Impossible de créer l'agence"
}

export function AgencyOnboarding() {
  const navigate = useNavigate()
  const { loading, session, agency, refreshAgency } = useAuth()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (isDemoMode || agency) return <Navigate to="/" replace />
  if (!loading && !session) return <Navigate to="/auth" replace />

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setSaving(true)

    try {
      const { error } = await supabase.rpc('create_agency_for_current_user', { p_name: name.trim() })
      if (error) throw error
      await refreshAgency()
      navigate('/', { replace: true })
    } catch (err) {
      setError(getOnboardingErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="soft-grid flex min-h-[100dvh] items-center justify-center bg-slate-100 p-4">
      <div className="app-panel w-full max-w-md p-6 sm:p-8">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-700 shadow-[0_18px_34px_-22px_rgba(4,120,87,0.9)]">
              <Building2 className="h-7 w-7 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Créer votre agence</h1>
          <p className="mt-2 text-sm text-slate-500">Votre espace sera isolé des autres agences.</p>
        </div>
        <div className="mt-7">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="agency-name">Nom de l'agence</Label>
              <Input
                id="agency-name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Agence Dupont"
                required
              />
            </div>

            {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? 'Création…' : "Créer l'agence"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
