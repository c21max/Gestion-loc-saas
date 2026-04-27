import { AlertTriangle } from 'lucide-react'

export function DemoBanner() {
  return (
    <div className="flex items-center justify-center gap-2 bg-amber-400 px-4 py-2 text-sm font-medium text-amber-900">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>
        Mode démo — Supabase non configuré. Les données affichées sont fictives. Les actions d'écriture sont désactivées.
      </span>
    </div>
  )
}
