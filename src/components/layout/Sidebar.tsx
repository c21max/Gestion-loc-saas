import { NavLink, useNavigate } from 'react-router-dom'
import {
  BarChart2, Home, Banknote, Building2,
  Wrench, FileUp, ArrowLeftRight, ScrollText, SlidersHorizontal,
  ChevronLeft, ChevronRight, LogOut, Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase, isDemoMode } from '@/lib/supabase'

const navItems = [
  { to: '/', icon: BarChart2, label: 'Dashboard', end: true },
  { to: '/portefeuille', icon: Home, label: 'Portefeuille' },
  { to: '/proprietaires', icon: Users, label: 'Propriétaires' },
  { to: '/paiements', icon: Banknote, label: 'Paiements' },
  { to: '/frais', icon: Wrench, label: 'Frais' },
  { to: '/import-bancaire', icon: FileUp, label: 'Import bancaire' },
  { to: '/reconciliation', icon: ArrowLeftRight, label: 'Réconciliation' },
  { to: '/decomptes', icon: ScrollText, label: 'Décomptes' },
]

const mobileItems = navItems.filter(item =>
  ['/', '/portefeuille', '/import-bancaire', '/reconciliation'].includes(item.to)
)

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { agency, user } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    if (!isDemoMode) await supabase.auth.signOut()
    navigate('/auth', { replace: true })
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ease-out active:scale-[0.98]',
      isActive
        ? 'bg-emerald-700 text-white shadow-[0_16px_30px_-22px_rgba(4,120,87,0.9)]'
        : 'text-slate-600 hover:bg-slate-100/90 hover:text-slate-950',
      collapsed && 'justify-center px-2'
    )

  return (
    <>
      <aside
        className={cn(
          'sticky top-0 hidden h-[100dvh] flex-col border-r border-white/70 bg-white/86 shadow-[18px_0_60px_-48px_rgba(15,23,42,0.85)] backdrop-blur-xl transition-all duration-300 lg:flex',
          collapsed ? 'w-16' : 'w-72'
        )}
      >
        <div className={cn('flex items-center gap-3 border-b border-slate-200/70 px-4 py-5', collapsed && 'justify-center px-2')}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_18px_30px_-22px_rgba(15,23,42,0.95)]">
            <Building2 className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-slate-950">{agency?.name ?? 'Gestion Locative'}</p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-700">Espace agence</p>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end} className={navLinkClass} title={collapsed ? label : undefined}>
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
          ))}

          <div className="my-2 border-t border-slate-200/70" />

          <NavLink to="/parametres" className={navLinkClass} title={collapsed ? 'Paramètres' : undefined}>
            <SlidersHorizontal className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Paramètres</span>}
          </NavLink>
        </nav>

        <div className="border-t border-slate-200/70 p-3">
          {collapsed ? (
            <button
              onClick={handleLogout}
              title={isDemoMode ? 'Connexion' : 'Déconnexion'}
              className="flex w-full items-center justify-center rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <LogOut className="h-4 w-4" />
            </button>
          ) : (
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-xs font-semibold text-white">
                {(user?.email?.[0] ?? 'U').toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-slate-700">{user?.email ?? 'Utilisateur'}</p>
                <p className="text-[11px] text-slate-400">{isDemoMode ? 'Mode démo' : 'Session active'}</p>
              </div>
              <button
                onClick={handleLogout}
                title={isDemoMode ? 'Connexion' : 'Déconnexion'}
                className="shrink-0 rounded-xl p-2 text-slate-400 transition-colors hover:bg-white hover:text-slate-800"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => setCollapsed(c => !c)}
          className="absolute -right-3 top-24 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.8)] transition-colors hover:bg-slate-50"
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </aside>

      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 gap-1 rounded-2xl border border-white/70 bg-white/88 p-1.5 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.65)] backdrop-blur-xl lg:hidden">
        {mobileItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => cn(
              'flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-semibold transition-all duration-200',
              isActive ? 'bg-slate-950 text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950',
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="max-w-full truncate">{label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  )
}
