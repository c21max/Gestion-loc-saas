import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

const easeSpring = [0.16, 1, 0.3, 1] as const

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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: easeSpring }}
      className="flex flex-col gap-4 border-b border-slate-200/60 pb-5 sm:flex-row sm:items-end sm:justify-between"
    >
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold leading-tight tracking-tight text-slate-950 md:text-3xl">
          {title}
        </h1>
        {description && (
          <div className="mt-1.5 max-w-[65ch] text-sm leading-relaxed text-slate-500">
            {description}
          </div>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </motion.div>
  )
}

const toneStyles = {
  slate: {
    text: 'text-slate-950',
    bg: 'bg-slate-100',
    icon: 'text-slate-600',
    bar: 'bg-slate-400',
    border: 'border-slate-200',
  },
  green: {
    text: 'text-emerald-700',
    bg: 'bg-emerald-50',
    icon: 'text-emerald-600',
    bar: 'bg-emerald-500',
    border: 'border-emerald-200/60',
  },
  amber: {
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    icon: 'text-amber-600',
    bar: 'bg-amber-400',
    border: 'border-amber-200/60',
  },
  red: {
    text: 'text-rose-700',
    bg: 'bg-rose-50',
    icon: 'text-rose-500',
    bar: 'bg-rose-500',
    border: 'border-rose-200/60',
  },
  blue: {
    text: 'text-blue-700',
    bg: 'bg-blue-50',
    icon: 'text-blue-600',
    bar: 'bg-blue-500',
    border: 'border-blue-200/60',
  },
}

export function MetricCard({
  label,
  value,
  detail,
  tone = 'slate',
  icon,
  progress,
  index = 0,
}: {
  label: string
  value: ReactNode
  detail?: ReactNode
  tone?: 'slate' | 'green' | 'amber' | 'red' | 'blue'
  icon?: ReactNode
  progress?: number
  index?: number
}) {
  const t = toneStyles[tone]

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: easeSpring, delay: index * 0.07 }}
      className="app-surface overflow-hidden p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-400">
            {label}
          </p>
          <div className={cn('mt-2 text-2xl font-semibold tracking-tight md:text-3xl', t.text)}>
            {value}
          </div>
        </div>
        {icon && (
          <div className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border',
            t.bg, t.icon, t.border
          )}>
            {icon}
          </div>
        )}
      </div>
      {detail && (
        <div className="mt-2 text-xs text-slate-400">{detail}</div>
      )}
      {typeof progress === 'number' && (
        <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-slate-100">
          <motion.div
            className={cn('h-full rounded-full', t.bar)}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            transition={{ duration: 0.8, ease: easeSpring, delay: index * 0.07 + 0.2 }}
          />
        </div>
      )}
    </motion.div>
  )
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: easeSpring }}
      className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-12 text-center"
    >
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-[0_2px_8px_-2px_rgba(15,23,42,0.1)]">
          {icon}
        </div>
      )}
      <h2 className="text-sm font-semibold tracking-tight text-slate-800">{title}</h2>
      {description && (
        <p className="mt-1.5 max-w-md text-sm text-slate-400">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  )
}

export function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={cn(
      'animate-pulse rounded-2xl bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100',
      className
    )} />
  )
}

export function PageLoader() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between border-b border-slate-200/60 pb-5">
        <div className="space-y-2">
          <SkeletonBlock className="h-8 w-48" />
          <SkeletonBlock className="h-4 w-72" />
        </div>
        <SkeletonBlock className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map(i => (
          <SkeletonBlock key={i} className="h-28" />
        ))}
      </div>
      <SkeletonBlock className="h-80" />
    </div>
  )
}
