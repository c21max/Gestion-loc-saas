import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase, isDemoMode } from '@/lib/supabase'
import { DEMO_PAIEMENTS } from '@/lib/demo-data'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { eur, dateFr, moisFr, currentMonthStr } from '@/lib/format'
import type { PaiementStatut } from '@/types/database'
import { useAuth } from '@/lib/auth'
import { PageHeader } from '@/components/ui/page'

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
    queryKey: ['paiements', agencyId, moisStr],
    enabled: isDemoMode || Boolean(agencyId),
    queryFn: async () => {
      if (isDemoMode) return DEMO_PAIEMENTS.filter(p => p.mois_concerne === moisIso)

      const { data } = await supabase
        .from('paiements')
        .select('*, locataires (nom_complet), biens (adresse), rental_units (libelle)')
        .eq('agency_id', agencyId)
        .eq('mois_concerne', moisIso)
        .order('created_at', { ascending: false })
      return data ?? []
    },
  })

  if (isLoading) return <div className="animate-pulse text-slate-400 text-sm">Chargement…</div>

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
            className="h-9 w-40 border-slate-200 bg-white text-sm"
          />
        }
      />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="table-pro">
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
                    <tr key={p.id}>
                      <td className="font-medium text-slate-950">{loc?.nom_complet}</td>
                      <td>
                        <div className="text-slate-700">{bien?.adresse}</div>
                        <div className="text-[12px] text-slate-400">{unit?.libelle}</div>
                      </td>
                      <td className="text-slate-600">{moisFr(p.mois_concerne)}</td>
                      <td className="text-slate-600">{dateFr(p.date_paiement)}</td>
                      <td className="text-slate-700">{eur(p.loyer_htva)}</td>
                      <td className="text-slate-500">{p.charges > 0 ? eur(p.charges) : '—'}</td>
                      <td className="font-semibold text-slate-950">{eur(p.total_percu)}</td>
                      <td><Badge variant={cfg.variant}>{cfg.label}</Badge></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {(data ?? []).length === 0 && (
              <p className="py-10 text-center text-[13px] text-slate-400">
                Aucun paiement pour ce mois.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
