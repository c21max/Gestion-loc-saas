import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="motion-enter flex flex-col gap-4 border-b border-slate-200/70 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-3xl font-semibold leading-tight tracking-tight text-slate-950 md:text-4xl">{title}</h1>
        {description && <div className="mt-2 max-w-[65ch] text-sm leading-relaxed text-slate-500">{description}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

const toneStyles = {
  slate: { text: 'text-slate-950', bg: 'bg-slate-100', icon: 'text-slate-600', bar: 'bg-slate-500' },
  green: { text: 'text-emerald-800', bg: 'bg-emerald-50', icon: 'text-emerald-700', bar: 'bg-emerald-600' },
  amber: { text: 'text-amber-700', bg: 'bg-amber-50', icon: 'text-amber-600', bar: 'bg-amber-400' },
  red:   { text: 'text-rose-700',   bg: 'bg-rose-50',   icon: 'text-rose-600',   bar: 'bg-rose-500'   },
  blue:  { text: 'text-cyan-700',    bg: 'bg-cyan-50',    icon: 'text-cyan-600',    bar: 'bg-cyan-500'    },
}

export function MetricCard({
  label,
  value,
  detail,
  tone = 'slate',
  icon,
  progress,
}: {
  label: string
  value: ReactNode
  detail?: ReactNode
  tone?: 'slate' | 'green' | 'amber' | 'red' | 'blue'
  icon?: ReactNode
  progress?: number
}) {
  const t = toneStyles[tone]

  return (
    <div className="app-panel motion-enter overflow-hidden p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
          <div className={cn('mt-2 text-2xl font-semibold tracking-tight md:text-3xl', t.text)}>{value}</div>
        </div>
        {icon && (
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]', t.bg, t.icon)}>
            {icon}
          </div>
        )}
      </div>
      {detail && <div className="mt-2 text-xs text-slate-500">{detail}</div>}
      {typeof progress === 'number' && (
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={cn('h-full rounded-full transition-all duration-500', t.bar)}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="app-panel soft-grid flex min-h-[220px] flex-col items-center justify-center px-6 py-12 text-center">
      <h2 className="text-base font-semibold tracking-tight text-slate-950">{title}</h2>
      {description && <p className="mt-2 max-w-md text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-2xl bg-gradient-to-r from-slate-200/70 via-slate-100 to-slate-200/70', className)} />
}
