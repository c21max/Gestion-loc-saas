import { Navigate } from 'react-router-dom'
import { isDemoMode } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { loading, session, agency } = useAuth()

  if (!isDemoMode && loading) {
    return (
      <div className="soft-grid flex min-h-[100dvh] items-center justify-center bg-slate-100 p-6">
        <div className="app-panel w-full max-w-sm p-6">
          <div className="h-3 w-28 animate-pulse rounded-full bg-slate-200" />
          <div className="mt-5 space-y-3">
            <div className="h-10 animate-pulse rounded-2xl bg-slate-200/80" />
            <div className="h-10 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-10 animate-pulse rounded-2xl bg-slate-100" />
          </div>
        </div>
      </div>
    )
  }

  if (!isDemoMode && !session) return <Navigate to="/auth" replace />
  if (!isDemoMode && session && !agency) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}
