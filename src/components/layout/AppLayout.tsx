import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { isDemoMode } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const routeLabels: Record<string, string> = {
  '/': 'Dashboard',
  '/portefeuille': 'Portefeuille',
  '/proprietaires': 'Propriétaires',
  '/paiements': 'Paiements',
  '/frais': 'Frais divers',
  '/import-bancaire': 'Import bancaire',
  '/reconciliation': 'Réconciliation',
  '/decomptes': 'Décomptes',
  '/parametres': 'Paramètres',
}

export function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [search, setSearch] = useState('')
  const { agency } = useAuth()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (search.trim()) navigate(`/portefeuille?q=${encodeURIComponent(search.trim())}`)
  }

  const currentLabel = routeLabels[location.pathname] ?? 'App'

  return (
    <div className="soft-grid flex min-h-[100dvh] bg-slate-100/50">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-200/60 bg-white/88 px-4 py-3 backdrop-blur-xl sm:px-6">
          <div className="mx-auto flex max-w-[1400px] items-center gap-4">
            {/* Mobile: agency name */}
            <div className="min-w-0 flex-1 lg:hidden">
              <p className="truncate text-sm font-semibold tracking-tight text-slate-950">
                {agency?.name ?? 'Gestion Locative'}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-blue-600">
                {currentLabel}
              </p>
            </div>

            {/* Desktop: search */}
            <form onSubmit={handleSearch} className="hidden w-full max-w-md sm:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Rechercher un locataire, une adresse…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="h-9 border-slate-200 bg-slate-50 pl-9 text-sm shadow-none focus-visible:ring-blue-600/20"
                />
              </div>
            </form>

            {/* Demo badge */}
            {isDemoMode && (
              <div className={cn(
                'hidden items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold md:flex',
                'border-amber-200/80 bg-amber-50 text-amber-700'
              )}>
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                Mode démo
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 px-4 pb-24 pt-6 sm:px-6 sm:py-8 lg:pb-8">
          <div className="mx-auto max-w-[1400px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
