import type React from 'react'
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
import { motion, AnimatePresence } from 'framer-motion'

const navGroups: Array<{
  label: string
  items: Array<{ to: string; icon: React.ComponentType<{ className?: string }>; label: string; end?: boolean }>
}> = [
  {
    label: 'Vue d\'ensemble',
    items: [
      { to: '/', icon: BarChart2, label: 'Dashboard', end: true },
    ],
  },
  {
    label: 'Données',
    items: [
      { to: '/portefeuille', icon: Home, label: 'Portefeuille' },
      { to: '/proprietaires', icon: Users, label: 'Propriétaires' },
      { to: '/paiements', icon: Banknote, label: 'Paiements' },
      { to: '/frais', icon: Wrench, label: 'Frais' },
    ],
  },
  {
    label: 'Traitement',
    items: [
      { to: '/import-bancaire', icon: FileUp, label: 'Import bancaire' },
      { to: '/reconciliation', icon: ArrowLeftRight, label: 'Réconciliation' },
    ],
  },
  {
    label: 'Exports',
    items: [
      { to: '/decomptes', icon: ScrollText, label: 'Décomptes' },
    ],
  },
]

const mobileItems = [
  { to: '/', icon: BarChart2, label: 'Dashboard', end: true as const },
  { to: '/portefeuille', icon: Home, label: 'Portefeuille', end: false as const },
  { to: '/import-bancaire', icon: FileUp, label: 'Import', end: false as const },
  { to: '/reconciliation', icon: ArrowLeftRight, label: 'Réconcil.', end: false as const },
]

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
      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ease-out',
      isActive
        ? 'bg-slate-950 text-white shadow-[0_4px_12px_-4px_rgba(15,23,42,0.5)]'
        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950',
      collapsed && 'justify-center px-2'
    )

  return (
    <>
      <aside
        className={cn(
          'sticky top-0 hidden h-[100dvh] flex-col border-r border-slate-200/60 bg-white/92 shadow-[1px_0_0_0_rgba(15,23,42,0.04)] backdrop-blur-xl transition-all duration-300 lg:flex',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className={cn(
          'flex items-center gap-3 border-b border-slate-100 px-4 py-4',
          collapsed && 'justify-center px-2'
        )}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white shadow-[0_4px_12px_-4px_rgba(15,23,42,0.6)]">
            <Building2 className="h-4.5 w-4.5 h-[18px] w-[18px]" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="min-w-0 overflow-hidden"
              >
                <p className="truncate text-sm font-semibold tracking-tight text-slate-950">
                  {agency?.name ?? 'Gestion Locative'}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-blue-600">
                  Espace agence
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 pb-4">
          {navGroups.map((group, gi) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="nav-section-label">{group.label}</p>
              )}
              {collapsed && gi > 0 && (
                <div className="my-2 border-t border-slate-100" />
              )}
              <div className="space-y-0.5">
                {group.items.map(({ to, icon: Icon, label, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={navLinkClass}
                    title={collapsed ? label : undefined}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">{label}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}

          <div className="my-2 border-t border-slate-100" />
          <div className="space-y-0.5">
            <NavLink
              to="/parametres"
              className={navLinkClass}
              title={collapsed ? 'Paramètres' : undefined}
            >
              <SlidersHorizontal className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Paramètres</span>}
            </NavLink>
          </div>
        </nav>

        {/* User footer */}
        <div className="border-t border-slate-100 p-2">
          {collapsed ? (
            <button
              onClick={handleLogout}
              title={isDemoMode ? 'Connexion' : 'Déconnexion'}
              className="flex w-full items-center justify-center rounded-xl p-2.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800"
            >
              <LogOut className="h-4 w-4" />
            </button>
          ) : (
            <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-semibold text-white">
                {(user?.email?.[0] ?? 'U').toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-slate-700">{user?.email ?? 'Utilisateur'}</p>
                <p className="text-[10px] text-slate-400">{isDemoMode ? 'Mode démo' : 'Session active'}</p>
              </div>
              <button
                onClick={handleLogout}
                title={isDemoMode ? 'Connexion' : 'Déconnexion'}
                className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white hover:text-slate-700"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.15)] transition-colors hover:bg-slate-50 hover:text-slate-700"
        >
          {collapsed
            ? <ChevronRight className="h-3 w-3" />
            : <ChevronLeft className="h-3 w-3" />
          }
        </button>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 gap-1 rounded-2xl border border-slate-200/60 bg-white/92 p-1.5 shadow-[0_8px_32px_-8px_rgba(15,23,42,0.2)] backdrop-blur-xl lg:hidden">
        {mobileItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => cn(
              'flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-semibold transition-all duration-200',
              isActive
                ? 'bg-slate-950 text-white'
                : 'text-slate-400 hover:bg-slate-100 hover:text-slate-800',
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
