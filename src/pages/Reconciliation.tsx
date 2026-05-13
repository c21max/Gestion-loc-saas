import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { isDemoMode } from '@/lib/supabase'
import {
  DEMO_RECONCILIATION_LOCATAIRES, DEMO_EXPECTED_RENTS,
  DEMO_PAIEMENTS, DEMO_BANK_MOVEMENTS, DEMO_MOIS_ISO,
} from '@/lib/demo-data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { eur, moisFr, dateFr, currentMonthStr } from '@/lib/format'
import { CheckCircle, AlertCircle, Clock, XCircle, Search, Zap } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { BankMovement, MonthlyExpectedRent, Paiement } from '@/types/database'
import { useAuth } from '@/lib/auth'
import { MetricCard, PageHeader, PageLoader } from '@/components/ui/page'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { queryKeys } from '@/api/queryKeys'
import { getReconciliationData } from '@/api/reconciliation.api'
import { assignMovementToTenant } from '@/services/reconciliation.service'

type StatutRow = 'paye_confirme' | 'paiement_probable' | 'partiel' | 'impaye'

const STATUT_CONFIG: Record<StatutRow, {
  label: string
  variant: 'success' | 'info' | 'warning' | 'danger'
  icon: React.ComponentType<{ className?: string }>
}> = {
  paye_confirme: { label: 'Payé', variant: 'success', icon: CheckCircle },
  paiement_probable: { label: 'Probable', variant: 'info', icon: Clock },
  partiel: { label: 'Partiel', variant: 'warning', icon: AlertCircle },
  impaye: { label: 'Impayé', variant: 'danger', icon: XCircle },
}

function statutRow(totalPercu: number, attendu: number, movement?: BankMovement | null): StatutRow {
  if (totalPercu >= attendu && attendu > 0) return 'paye_confirme'
  if (movement && (movement.match_score ?? 0) >= 90 && Math.abs(movement.amount - attendu) <= 0.5) return 'paiement_probable'
  if (totalPercu > 0 && totalPercu < attendu) return 'partiel'
  return 'impaye'
}

export function Reconciliation() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const { agency } = useAuth()
  const agencyId = agency?.id

  const [moisStr, setMoisStr] = useState<string>(currentMonthStr())
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'tous' | StatutRow>('tous')
  const moisIso = `${moisStr}-01`

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.reconciliation(agencyId, moisStr),
    enabled: isDemoMode || Boolean(agencyId),
    queryFn: async () => {
      if (isDemoMode) {
        return {
          locataires: DEMO_RECONCILIATION_LOCATAIRES,
          expected: DEMO_EXPECTED_RENTS.filter(e => e.mois_concerne === DEMO_MOIS_ISO) as MonthlyExpectedRent[],
          paiements: DEMO_PAIEMENTS.filter(p => p.mois_concerne === DEMO_MOIS_ISO) as Paiement[],
          movements: DEMO_BANK_MOVEMENTS.filter(m => m.status === 'a_valider') as BankMovement[],
        }
      }

      return getReconciliationData(agencyId, moisIso)
    },
  })

  const locataires = data?.locataires ?? []
  const expected = data?.expected ?? []
  const paiements = data?.paiements ?? []
  const movements = data?.movements ?? []

  const rows = locataires.map(loc => {
    const mer = expected.find(e => e.locataire_id === loc.id)
    const paies = paiements.filter(p => p.locataire_id === loc.id)
    const totalPercu = paies.reduce((s, p) => s + p.total_percu, 0)
    const attendu = mer ? mer.loyer_attendu + mer.charges_attendues : 0
    const movement = movements.find(m => paies.some(p => p.bank_movement_id === m.id)) ?? null
    return { loc, mer, paies, totalPercu, attendu, movement, statut: statutRow(totalPercu, attendu, movement) }
  })

  const filteredRows = rows.filter(row => {
    const unit = (row.loc as unknown as { rental_units?: { libelle?: string; biens?: { adresse?: string } } }).rental_units
    const haystack = [row.loc.nom_complet, unit?.libelle, unit?.biens?.adresse].join(' ').toLowerCase()
    const matchesSearch = !search || haystack.includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'tous' || row.statut === statusFilter
    return matchesSearch && matchesStatus
  })

  const kpis = {
    totalAttendu: rows.reduce((s, r) => s + r.attendu, 0),
    totalPercu: rows.reduce((s, r) => s + r.totalPercu, 0),
    nbPayes: rows.filter(r => r.statut === 'paye_confirme').length,
    nbImpayes: rows.filter(r => r.statut === 'impaye').length,
  }

  const [selectedMouvement, setSelectedMouvement] = useState<string>('')
  const [targetLocataire, setTargetLocataire] = useState<string>('')
  const [targetMois, setTargetMois] = useState<string>(moisStr)
  const [memoriser, setMemoriser] = useState(false)

  const affecterMutation = useMutation({
    mutationFn: async () => {
      if (isDemoMode) {
        toast({ title: 'Mode démo', description: 'Connectez Supabase pour affecter des paiements.' })
        return
      }
      const mouv = movements.find(m => m.id === selectedMouvement)
      const loc = locataires.find(l => l.id === targetLocataire) as (typeof locataires[0] & { rental_units: { id: string; biens: { id: string } } }) | undefined
      if (!mouv || !loc) throw new Error('Mouvement ou locataire introuvable')
      if (!agencyId) throw new Error('Aucune agence active')

      await assignMovementToTenant({
        agencyId,
        movement: mouv,
        locataire: loc,
        month: targetMois,
        rememberAlias: memoriser,
      })
    },
    onSuccess: () => {
      if (!isDemoMode) {
        toast({ title: 'Paiement créé', description: 'Le mouvement a été affecté avec succès.' })
        qc.invalidateQueries({ queryKey: queryKeys.reconciliation(agencyId) })
      }
      setSelectedMouvement('')
      setTargetLocataire('')
    },
    onError: (err: Error) => toast({ title: 'Erreur', description: err.message, variant: 'destructive' }),
  })

  const mouvementsNonReconnus = movements.filter(m => m.status === 'a_valider' && m.direction === 'credit')

  if (isLoading) return <PageLoader />

  const tauxRecouvrement = kpis.totalAttendu > 0 ? (kpis.totalPercu / kpis.totalAttendu) * 100 : 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Réconciliation"
        description={`Validation des loyers et mouvements bancaires — ${moisFr(moisIso)}`}
        actions={
          <Input
            type="month"
            value={moisStr}
            onChange={e => setMoisStr(e.target.value)}
            className="w-44 border-slate-200 bg-white shadow-none"
          />
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard index={0} label="Total attendu" value={eur(kpis.totalAttendu)} />
        <MetricCard index={1} label="Total reçu" value={eur(kpis.totalPercu)} tone="green" progress={tauxRecouvrement} />
        <MetricCard index={2} label="Reste dû" value={eur(kpis.totalAttendu - kpis.totalPercu)} tone="amber" />
        <MetricCard index={3} label="Impayés" value={`${kpis.nbImpayes} / ${rows.length}`} tone="red" />
      </div>

      {/* Loyers du mois */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>Loyers du mois</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher..."
                  className="h-9 w-full bg-slate-50 pl-9 shadow-none sm:w-60"
                />
              </div>
              <Select value={statusFilter} onValueChange={v => setStatusFilter(v as typeof statusFilter)}>
                <SelectTrigger className="h-9 w-full border-slate-200 bg-white sm:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous les statuts</SelectItem>
                  <SelectItem value="paye_confirme">Payés</SelectItem>
                  <SelectItem value="partiel">Partiels</SelectItem>
                  <SelectItem value="impaye">Impayés</SelectItem>
                  <SelectItem value="paiement_probable">À vérifier</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <motion.table
              className="table-pro"
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.03 } } }}
            >
              <thead>
                <tr>
                  {['Locataire', 'Bien / unité', 'Attendu', 'Reçu', 'Différence', 'Statut', 'Mouvement', 'Action'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map(row => {
                  const cfg = STATUT_CONFIG[row.statut]
                  const Icon = cfg.icon
                  const unit = (row.loc as unknown as { rental_units: { libelle: string; biens: { adresse: string } } }).rental_units
                  const diff = row.attendu - row.totalPercu
                  return (
                    <motion.tr
                      key={row.loc.id}
                      variants={{
                        hidden: { opacity: 0, y: 4 },
                        show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } },
                      }}
                    >
                      <td className="font-medium text-slate-950">{row.loc.nom_complet}</td>
                      <td>
                        <div className="text-sm text-slate-700">{unit.biens.adresse}</div>
                        <div className="text-[11px] text-slate-400">{unit.libelle}</div>
                      </td>
                      <td className="text-slate-600">{row.attendu > 0 ? eur(row.attendu) : '—'}</td>
                      <td className="font-medium text-slate-950">{row.totalPercu > 0 ? eur(row.totalPercu) : '—'}</td>
                      <td className={cn('font-medium', diff > 0 ? 'text-rose-600' : 'text-emerald-600')}>
                        {row.attendu > 0 ? eur(diff) : '—'}
                      </td>
                      <td>
                        <Badge variant={cfg.variant} className="flex w-fit items-center gap-1">
                          <Icon className="h-3 w-3" />
                          {cfg.label}
                        </Badge>
                      </td>
                      <td className="text-[12px] text-slate-400">
                        {row.movement
                          ? `${eur(row.movement.amount)} · ${dateFr(row.movement.operation_date)}`
                          : '—'}
                      </td>
                      <td>
                        {row.statut !== 'paye_confirme' && (
                          <Button
                            variant={row.statut === 'paiement_probable' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setTargetLocataire(row.loc.id)}
                          >
                            {row.statut === 'paiement_probable' && <Zap className="mr-1.5 h-3 w-3" />}
                            Affecter
                          </Button>
                        )}
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </motion.table>
          </div>
        </CardContent>
      </Card>

      {/* Mouvements non reconnus */}
      {mouvementsNonReconnus.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Mouvements non reconnus
              <span className="ml-2 inline-flex h-5 items-center rounded-full bg-amber-100 px-2 text-[11px] font-semibold text-amber-700">
                {mouvementsNonReconnus.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto">
              <table className="table-pro">
                <thead>
                  <tr>
                    {['Date', 'Donneur', 'IBAN', 'Communication', 'Montant', 'Score', 'Action'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mouvementsNonReconnus.map(m => (
                    <tr key={m.id}>
                      <td className="text-slate-500">{dateFr(m.operation_date)}</td>
                      <td className="max-w-[160px] truncate font-medium text-slate-950">{m.counterparty_name ?? '—'}</td>
                      <td className="font-mono text-[11px] text-slate-400">{m.counterparty_iban ?? '—'}</td>
                      <td className="max-w-[200px] truncate text-slate-500">{m.communication ?? '—'}</td>
                      <td className="font-semibold text-emerald-600">{eur(m.amount)}</td>
                      <td>
                        {m.match_score !== null && (
                          <Badge variant={m.match_score >= 90 ? 'success' : m.match_score >= 60 ? 'warning' : 'secondary'}>
                            {m.match_score}
                          </Badge>
                        )}
                      </td>
                      <td>
                        <Button variant="outline" size="sm" onClick={() => setSelectedMouvement(m.id)}>
                          Affecter
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {(selectedMouvement || targetLocataire) && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-5"
              >
                <h3 className="text-sm font-semibold text-slate-950">Affectation manuelle</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-500">Mouvement</label>
                    <Select value={selectedMouvement} onValueChange={setSelectedMouvement}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir un mouvement" />
                      </SelectTrigger>
                      <SelectContent>
                        {mouvementsNonReconnus.map(m => (
                          <SelectItem key={m.id} value={m.id}>
                            {dateFr(m.operation_date)} — {eur(m.amount)} — {m.counterparty_name ?? 'Inconnu'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-500">Locataire</label>
                    <Select value={targetLocataire} onValueChange={setTargetLocataire}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir un locataire" />
                      </SelectTrigger>
                      <SelectContent>
                        {locataires.map(l => (
                          <SelectItem key={l.id} value={l.id}>{l.nom_complet}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-500">Mois concerné</label>
                    <Input type="month" value={targetMois} onChange={e => setTargetMois(e.target.value)} />
                  </div>
                </div>

                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={memoriser}
                    onChange={e => setMemoriser(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  Mémoriser cette correspondance (IBAN/nom → locataire)
                </label>

                <div className="flex gap-2">
                  <Button
                    onClick={() => affecterMutation.mutate()}
                    disabled={!selectedMouvement || !targetLocataire || affecterMutation.isPending}
                  >
                    {affecterMutation.isPending ? 'Création…' : 'Créer le paiement'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { setSelectedMouvement(''); setTargetLocataire('') }}
                  >
                    Annuler
                  </Button>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
