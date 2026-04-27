import { Outlet, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Search, Sparkles } from 'lucide-react'
import { useAuth } from '@/lib/auth'

export function AppLayout() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const { agency } = useAuth()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (search.trim()) navigate(`/portefeuille?q=${encodeURIComponent(search.trim())}`)
  }

  return (
    <div className="soft-grid flex min-h-[100dvh] bg-slate-100/70">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col lg:pl-0">
        <header className="sticky top-0 z-30 border-b border-white/70 bg-white/78 px-4 py-3 shadow-[0_18px_45px_-36px_rgba(15,23,42,0.55)] backdrop-blur-xl sm:px-6">
          <div className="mx-auto flex max-w-[1400px] items-center gap-3">
            <div className="min-w-0 flex-1 lg:hidden">
              <p className="truncate text-sm font-semibold tracking-tight text-slate-950">{agency?.name ?? 'Gestion Locative'}</p>
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-emerald-700">Espace agence</p>
            </div>
            <form onSubmit={handleSearch} className="hidden w-full max-w-lg sm:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Rechercher un locataire, une adresse…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-10 border-slate-200/80 bg-slate-50/90 pl-9 text-sm"
              />
            </div>
          </form>
            <div className="hidden items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-3 py-1.5 text-xs font-semibold text-emerald-800 md:flex">
              <Sparkles className="h-3.5 w-3.5" />
              Données isolées par agence
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 pb-24 pt-5 sm:px-6 sm:py-7 lg:pb-8">
          <div className="mx-auto max-w-[1400px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
