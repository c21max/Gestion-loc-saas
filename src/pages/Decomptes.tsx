import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isDemoMode } from '@/lib/supabase'
import { DEMO_BIENS_ACTIFS, DEMO_OWNER_STATEMENTS, DEMO_PAIEMENTS, DEMO_FRAIS } from '@/lib/demo-data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { eur, moisFr, dateFr, currentMonthStr } from '@/lib/format'
import { Download, FileText, RefreshCw, Wallet } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { calcDecompte } from '@/lib/decompte'
import { PDFDownloadLink } from '@react-pdf/renderer'
import { DecomptePDF } from '@/components/DecomptePDF'
import type { OwnerStatement, Bien, Proprietaire, Paiement, FraisDivers, AgencySettings } from '@/types/database'
import { useAuth } from '@/lib/auth'
import { EmptyState, MetricCard, PageHeader } from '@/components/ui/page'

export function Decomptes() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const { agency } = useAuth()
  const agencyId = agency?.id
  const [moisStr, setMoisStr] = useState(currentMonthStr())
  const moisIso = `${moisStr}-01`

  const { data: biens } = useQuery({
    queryKey: ['biens-actifs', agencyId],
    enabled: isDemoMode || Boolean(agencyId),
    queryFn: async () => {
      if (isDemoMode) return DEMO_BIENS_ACTIFS

      const { data } = await supabase
        .from('biens')
        .select('*, proprietaires (*), rental_units (*)')
        .eq('agency_id', agencyId)
        .eq('statut', 'actif')
      return data ?? []
    },
  })

  const { data: statements } = useQuery({
    queryKey: ['owner-statements', agencyId, moisStr],
    enabled: isDemoMode || Boolean(agencyId),
    queryFn: async () => {
      if (isDemoMode) return DEMO_OWNER_STATEMENTS.filter(s => s.mois_concerne === moisIso)

      const { data } = await supabase
        .from('owner_statements')
        .select('*, biens (adresse), proprietaires (nom_complet)')
        .eq('agency_id', agencyId)
        .eq('mois_concerne', moisIso)
      return data ?? []
    },
  })

  const { data: liveData } = useQuery({
    queryKey: ['decomptes-live-data', agencyId, moisStr],
    enabled: isDemoMode || Boolean(agencyId),
    queryFn: async () => {
      if (isDemoMode) return { paiements: DEMO_PAIEMENTS as Paiement[], frais: DEMO_FRAIS as FraisDivers[] }

      const [paiementsRes, fraisRes] = await Promise.all([
        supabase.from('paiements').select('*').eq('agency_id', agencyId).eq('mois_concerne', moisIso),
        supabase.from('frais_divers').select('*').eq('agency_id', agencyId).eq('mois_concerne', moisIso),
      ])

      if (paiementsRes.error) throw paiementsRes.error
      if (fraisRes.error) throw fraisRes.error

      return {
        paiements: paiementsRes.data as Paiement[] ?? [],
        frais: fraisRes.data as FraisDivers[] ?? [],
      }
    },
  })

  const { data: agencySettings } = useQuery({
    queryKey: ['agency-settings', agencyId],
    enabled: isDemoMode || Boolean(agencyId),
    queryFn: async () => {
      if (isDemoMode) return null
      const { data } = await supabase.from('agency_settings').select('*').eq('agency_id', agencyId).single()
      return data as AgencySettings | null
    },
  })

  const genererMutation = useMutation({
    mutationFn: async (bien: typeof biens extends undefined ? never : NonNullable<typeof biens>[0]) => {
      if (isDemoMode) {
        toast({ title: 'Mode démo', description: 'Connectez Supabase pour générer les décomptes.' })
        return { bien, resultat: null }
      }

      if (!agencyId) throw new Error('Aucune agence active')

      const { data: paiements } = await supabase
        .from('paiements')
        .select('*')
        .eq('agency_id', agencyId)
        .eq('bien_id', bien.id)
        .eq('mois_concerne', moisIso)

      const { data: frais } = await supabase
        .from('frais_divers')
        .select('*')
        .eq('agency_id', agencyId)
        .eq('bien_id', bien.id)
        .eq('mois_concerne', moisIso)

      const units = (bien as unknown as { rental_units: NonNullable<typeof biens>[0]['rental_units'] }).rental_units ?? []
      const resultat = calcDecompte(paiements ?? [], frais ?? [], units)

      const { error } = await supabase.from('owner_statements').upsert({
        agency_id: agencyId,
        proprietaire_id: bien.proprietaire_id,
        bien_id: bien.id,
        mois_concerne: moisIso,
        total_percu: resultat.paiements.total_percu,
        total_frais_tvac: resultat.frais.tvac,
        honoraires_htva: resultat.honoraires.htva,
        honoraires_tva: resultat.honoraires.tva,
        honoraires_tvac: resultat.honoraires.tvac,
        solde_proprietaire: resultat.solde_proprietaire,
        genere_le: new Date().toISOString(),
      }, { onConflict: 'bien_id,mois_concerne' })

      if (error) throw error
      return { bien, resultat }
    },
    onSuccess: ({ bien }) => {
      if (!isDemoMode) {
        toast({ title: 'Décompte généré', description: `${bien.adresse} — ${moisFr(moisIso)}` })
        qc.invalidateQueries({ queryKey: ['owner-statements', agencyId, moisStr] })
      }
    },
    onError: (err: Error) => toast({ title: 'Erreur', description: err.message, variant: 'destructive' }),
  })

  const handleGenererTous = async () => {
    for (const bien of biens ?? []) {
      await genererMutation.mutateAsync(bien as Parameters<typeof genererMutation.mutateAsync>[0])
    }
  }

  const existingStatements = new Map((statements ?? []).map(s => [s.bien_id, s]))

  const getLiveStatement = (bien: NonNullable<typeof biens>[0]) => {
    const paiements = (liveData?.paiements ?? []).filter(p => p.bien_id === bien.id)
    const frais = (liveData?.frais ?? []).filter(f => f.bien_id === bien.id)
    if (paiements.length === 0 && frais.length === 0) return null

    const units = (bien as unknown as { rental_units: NonNullable<typeof biens>[0]['rental_units'] }).rental_units ?? []
    const proprio = (bien as unknown as { proprietaires: Proprietaire }).proprietaires
    const r = calcDecompte(paiements, frais, units)

    return {
      id: `live-stmt-${bien.id}-${moisIso}`,
      bien_id: bien.id,
      proprietaire_id: bien.proprietaire_id,
      mois_concerne: moisIso,
      total_percu: r.paiements.total_percu,
      total_frais_tvac: r.frais.tvac,
      honoraires_htva: r.honoraires.htva,
      honoraires_tva: r.honoraires.tva,
      honoraires_tvac: r.honoraires.tvac,
      solde_proprietaire: r.solde_proprietaire,
      pdf_storage_path: null,
      genere_le: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      biens: { adresse: bien.adresse },
      proprietaires: { nom_complet: proprio?.nom_complet ?? '' },
    }
  }

  // En mode démo, on calcule les décomptes à la volée pour afficher des données réalistes
  const getDemoStatement = (bienId: string) => {
    const paiements = DEMO_PAIEMENTS.filter(p => p.bien_id === bienId && p.mois_concerne === moisIso)
    const frais = DEMO_FRAIS.filter(f => f.bien_id === bienId && f.mois_concerne === moisIso)
    const bien = DEMO_BIENS_ACTIFS.find(b => b.id === bienId)
    if (!bien || (paiements.length === 0 && frais.length === 0)) return null
    const units = bien.rental_units
    const r = calcDecompte(paiements, frais, units)
    return {
      id: `demo-stmt-${bienId}`,
      bien_id: bienId,
      proprietaire_id: bien.proprietaire_id,
      mois_concerne: moisIso,
      total_percu: r.paiements.total_percu,
      total_frais_tvac: r.frais.tvac,
      honoraires_htva: r.honoraires.htva,
      honoraires_tva: r.honoraires.tva,
      honoraires_tvac: r.honoraires.tvac,
      solde_proprietaire: r.solde_proprietaire,
      pdf_storage_path: null,
      genere_le: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      biens: { adresse: bien.adresse },
      proprietaires: { nom_complet: bien.proprietaires.nom_complet },
    }
  }

  const visibleStatements = (biens ?? []).map(bien => {
    const liveStmt = isDemoMode ? null : getLiveStatement(bien)
    const stmt = isDemoMode ? getDemoStatement(bien.id) : liveStmt ?? existingStatements.get(bien.id)
    return stmt
  }).filter(Boolean) as OwnerStatement[]

  const summary = {
    totalPercu: visibleStatements.reduce((sum, stmt) => sum + Number(stmt.total_percu), 0),
    frais: visibleStatements.reduce((sum, stmt) => sum + Number(stmt.total_frais_tvac), 0),
    honoraires: visibleStatements.reduce((sum, stmt) => sum + Number(stmt.honoraires_tvac), 0),
    solde: visibleStatements.reduce((sum, stmt) => sum + Number(stmt.solde_proprietaire), 0),
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Décomptes propriétaires"
        description={`Synthèse comptable et exports PDF - ${moisFr(moisIso)}`}
        actions={
          <>
          <Input type="month" value={moisStr} onChange={e => setMoisStr(e.target.value)} className="w-44 bg-white" />
          <Button onClick={handleGenererTous} disabled={genererMutation.isPending}>
            <RefreshCw className={`mr-2 h-4 w-4 ${genererMutation.isPending ? 'animate-spin' : ''}`} />
            {isDemoMode ? 'Générer tous (démo)' : 'Générer tous'}
          </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total perçu" value={eur(summary.totalPercu)} tone="green" icon={<Wallet className="h-4 w-4" />} />
        <MetricCard label="Frais TVAC" value={eur(summary.frais)} tone="red" />
        <MetricCard label="Honoraires TVAC" value={eur(summary.honoraires)} tone="amber" />
        <MetricCard label="Solde propriétaires" value={eur(summary.solde)} icon={<FileText className="h-4 w-4" />} />
      </div>

      {(biens ?? []).length === 0 ? (
        <EmptyState title="Aucun bien actif" description="Ajoutez des biens au portefeuille pour générer des décomptes propriétaires." />
      ) : (
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {(biens ?? []).map(bien => {
          const liveStmt = isDemoMode ? null : getLiveStatement(bien)
          const stmt = isDemoMode ? getDemoStatement(bien.id) : liveStmt ?? existingStatements.get(bien.id)
          const proprio = (bien as unknown as { proprietaires: Proprietaire }).proprietaires

          return (
            <Card key={bien.id} className="transition-all hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{bien.adresse}</CardTitle>
                    <p className="mt-1 text-sm text-slate-500">{proprio?.nom_complet}</p>
                  </div>
                  {stmt ? (
                    <Badge variant={isDemoMode || liveStmt ? 'info' : 'success'} className="shrink-0">
                      {isDemoMode || liveStmt ? 'Calculé' : 'Généré'}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="shrink-0">À générer</Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {stmt ? (
                  <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Total perçu</span>
                      <span className="font-medium text-slate-950">{eur(stmt.total_percu)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Frais TVAC</span>
                      <span className="text-rose-600">- {eur(stmt.total_frais_tvac)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Honoraires TVAC</span>
                      <span className="text-rose-600">- {eur(stmt.honoraires_tvac)}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold">
                      <span>Solde propriétaire</span>
                      <span className={stmt.solde_proprietaire >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                        {eur(stmt.solde_proprietaire)}
                      </span>
                    </div>
                    {stmt.genere_le && <p className="text-xs text-slate-500">Généré le {dateFr(stmt.genere_le)}</p>}
                  </div>
                ) : (
                  <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Décompte non encore généré pour ce mois.</p>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => genererMutation.mutate(bien as Parameters<typeof genererMutation.mutate>[0])}
                    disabled={genererMutation.isPending}
                  >
                    <RefreshCw className="mr-2 h-3 w-3" />
                    {stmt ? 'Recalculer' : 'Générer'}
                  </Button>
                  {stmt && !isDemoMode && (
                    <PDFDownloadLink
                      document={
                        <DecomptePDF
                          statement={stmt as OwnerStatement}
                          bien={bien as Bien}
                          proprietaire={proprio}
                          agencySettings={agencySettings ?? undefined}
                          mois={moisIso}
                        />
                      }
                      fileName={`decompte_${bien.adresse.replace(/[^a-z0-9]/gi, '_')}_${moisStr}.pdf`}
                    >
                      {({ loading }) => (
                        <Button size="sm" disabled={loading}>
                          <Download className="mr-2 h-3 w-3" />
                          {loading ? 'Génération…' : 'Télécharger PDF'}
                        </Button>
                      )}
                    </PDFDownloadLink>
                  )}
                  {stmt && isDemoMode && (
                    <Button size="sm" variant="outline" onClick={() => toast({ title: 'Mode démo', description: 'Connectez Supabase pour télécharger les PDFs.' })}>
                      <Download className="mr-2 h-3 w-3" />
                      PDF (démo)
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
      )}
    </div>
  )
}
