import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isDemoMode, supabase } from '@/lib/supabase'
import { DEMO_AGENCY_SETTINGS } from '@/lib/demo-data'
import type { Agency, AgencyUserRole } from '@/types/database'

type AuthState = {
  loading: boolean
  session: Session | null
  user: User | null
  agency: Agency | null
  role: AgencyUserRole | null
  refreshAgency: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(!isDemoMode)
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [agency, setAgency] = useState<Agency | null>(null)
  const [role, setRole] = useState<AgencyUserRole | null>(null)

  const refreshAgency = async () => {
    if (isDemoMode) {
      setAgency({
        id: DEMO_AGENCY_SETTINGS.id,
        name: DEMO_AGENCY_SETTINGS.nom,
        address: DEMO_AGENCY_SETTINGS.adresse,
        postal_code: DEMO_AGENCY_SETTINGS.code_postal,
        city: DEMO_AGENCY_SETTINGS.ville,
        country: DEMO_AGENCY_SETTINGS.pays,
        email: DEMO_AGENCY_SETTINGS.email,
        phone: DEMO_AGENCY_SETTINGS.telephone,
        vat_number: DEMO_AGENCY_SETTINGS.numero_tva,
        logo_url: DEMO_AGENCY_SETTINGS.logo_url,
        default_vat_rate: DEMO_AGENCY_SETTINGS.taux_tva,
        default_management_fee_percentage: DEMO_AGENCY_SETTINGS.pourcentage_honoraires,
        currency: DEMO_AGENCY_SETTINGS.devise,
        created_at: DEMO_AGENCY_SETTINGS.updated_at,
        updated_at: DEMO_AGENCY_SETTINGS.updated_at,
      })
      setRole('owner')
      return
    }

    const { data: membership, error } = await supabase
      .from('agency_users')
      .select('role, agencies (*)')
      .order('created_at')
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Supabase agency lookup error:', error.message)
      setAgency(null)
      setRole(null)
      return
    }

    const row = membership as { role: AgencyUserRole; agencies: Agency | null } | null
    setAgency(row?.agencies ?? null)
    setRole(row?.role ?? null)
  }

  useEffect(() => {
    if (isDemoMode) {
      setLoading(false)
      setSession(null)
      setUser(null)
      void refreshAgency()
      return
    }

    let active = true

    supabase.auth.getSession().then(async ({ data, error }) => {
      if (!active) return
      if (error) {
        console.error('Supabase getSession error:', error.message)
      }
      setSession(data.session)
      setUser(data.session?.user ?? null)
      if (data.session) await refreshAgency()
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      if (nextSession) {
        setTimeout(() => { void refreshAgency() }, 0)
      } else {
        setAgency(null)
        setRole(null)
      }
      setLoading(false)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo(
    () => ({ loading, session, user, agency, role, refreshAgency }),
    [loading, session, user, agency, role]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}

export function AuthDebug() {
  const { loading, session, user } = useAuth()

  return (
    <div className="fixed bottom-2 right-2 z-50 rounded-md border bg-white/95 px-3 py-2 text-xs text-slate-700 shadow-md">
      <div>auth loading: {String(loading)}</div>
      <div>user email: {user?.email ?? 'none'}</div>
      <div>session exists: {String(Boolean(session))}</div>
    </div>
  )
}
