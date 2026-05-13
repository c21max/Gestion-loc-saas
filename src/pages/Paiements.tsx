import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { isDemoMode } from '@/lib/supabase'
import { DEMO_PAIEMENTS } from '@/lib/demo-data'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { eur, dateFr, moisFr, currentMonthStr } from '@/lib/format'
import type { PaiementStatut } from '@/types/database'
import { useAuth } from '@/lib/auth'
import { PageHeader, SkeletonBlock } from '@/components/ui/page'
import { motion } from 'framer-motion'
import { queryKeys } from '@/api/queryKeys'
import { listPaymentsWithDetails } from '@/api/payments.api'

const statutConfig: Record<PaiementStatut, { label: string; variant: 'success' | 'warning' | 'danger' | 'secondary' }> = {
  paye: { label: 'Payé', variant: 'success' },
  partiel: { label: 'Partiel', variant: 'warning' },
  impaye: { label: 'Impayé', variant: 'danger' },
  en_attente: { label: 'En attente', variant: 'secondary' },
}

export function Paiements() {
  const { agency } = useAuth()
  const agencyId = agency?.id
  const [moisStr, setMoisStr] = useState(currentMonthStr())
  const moisIso = `${moisStr}-01`

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.payments(agencyId, moisStr),
    enabled: isDemoMode || Boolean(agencyId),
    queryFn: async () => {
      if (isDemoMode) return DEMO_PAIEMENTS.filter(p => p.mois_concerne === moisIso)

      return listPaymentsWithDetails(agencyId, moisIso)
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Paiements"
        description={`${moisFr(moisIso)} — ${(data ?? []).length} paiement(s) enregistré(s)`}
        actions={
          <Input
            type="month"
            value={moisStr}
            onChange={e => setMoisStr(e.target.value)}
            className="h-9 w-40 border-slate-200 bg-white text-sm shadow-none"
          />
        }
      />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-5">
              <SkeletonBlock className="h-10" />
              <SkeletonBlock className="h-10" />
              <SkeletonBlock className="h-10" />
              <SkeletonBlock className="h-10" />
            </div>
          ) : (data ?? []).length === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center text-center">
              <p className="text-sm font-medium text-slate-700">Aucun paiement pour ce mois</p>
              <p className="mt-1 text-xs text-slate-400">Importez un extrait bancaire pour alimenter cette liste.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <motion.table
                className="table-pro"
                initial="hidden"
                animate="show"
                variants={{ show: { transition: { staggerChildren: 0.04 } } }}
              >
                <thead>
                  <tr>
                    {['Locataire', 'Bien / Unité', 'Mois', 'Date', 'Loyer', 'Charges', 'Total perçu', 'Statut'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data ?? []).map(p => {
                    const loc = (p as unknown as { locataires: { nom_complet: string } }).locataires
                    const bien = (p as unknown as { biens: { adresse: string } }).biens
                    const unit = (p as unknown as { rental_units: { libelle: string } }).rental_units
                    const cfg = statutConfig[p.statut as PaiementStatut] ?? statutConfig.en_attente
                    return (
                      <motion.tr
                        key={p.id}
                        variants={{
                          hidden: { opacity: 0, y: 6 },
                          show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } },
                        }}
                      >
                        <td className="font-medium text-slate-950">{loc?.nom_complet}</td>
                        <td>
                          <div className="text-slate-700">{bien?.adresse}</div>
                          {unit?.libelle && (
                            <div className="text-[11px] text-slate-400">{unit.libelle}</div>
                          )}
                        </td>
                        <td className="text-slate-500">{moisFr(p.mois_concerne)}</td>
                        <td className="text-slate-500">{dateFr(p.date_paiement)}</td>
                        <td className="text-slate-700">{eur(p.loyer_htva)}</td>
                        <td className="text-slate-400">{p.charges > 0 ? eur(p.charges) : '—'}</td>
                        <td className="font-semibold text-slate-950">{eur(p.total_percu)}</td>
                        <td><Badge variant={cfg.variant}>{cfg.label}</Badge></td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </motion.table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
