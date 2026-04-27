import { useQuery } from '@tanstack/react-query'
import { supabase, isDemoMode } from '@/lib/supabase'
import { getDemoDashboardKpis, DEMO_BANK_IMPORTS } from '@/lib/demo-data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { eur, moisFr, dateFr, currentMonthStr } from '@/lib/format'
import { ArrowRight, Clock, FileText, GitMerge, Receipt, TrendingDown, TrendingUp, Upload } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'
import { EmptyState, MetricCard, PageHeader } from '@/components/ui/page'

export function Dashboard() {
  const { agency } = useAuth()
  const agencyId = agency?.id
  const moisCourant = currentMonthStr()
  const moisIso = `${moisCourant}-01`

  const { data: kpis } = useQuery({
    queryKey: ['dashboard-kpis', agencyId, moisCourant],
    enabled: isDemoMode || Boolean(agencyId),
    queryFn: async () => {
      if (isDemoMode) return getDemoDashboardKpis()

      const { data: attendus } = await supabase
        .from('monthly_expected_rents')
        .select('loyer_attendu, charges_attendues')
        .eq('agency_id', agencyId)
        .eq('mois_concerne', moisIso)

      const { data: paiements } = await supabase
        .from('paiements')
        .select('total_percu, statut, locataire_id')
        .eq('agency_id', agencyId)
        .eq('mois_concerne', moisIso)

      const totalAttendu = (attendus ?? []).reduce((s, r) => s + r.loyer_attendu + r.charges_attendues, 0)
      const totalPercu = (paiements ?? []).reduce((s, p) => s + p.total_percu, 0)
      const nbPayes = (paiements ?? []).filter(p => p.statut === 'paye').length
      const locatairesPayants = new Set((paiements ?? []).map(p => p.locataire_id))
      const nbAttendusTot = (attendus ?? []).length
      const nbImpayes = nbAttendusTot - locatairesPayants.size

      return { totalAttendu, totalPercu, nbPayes, nbImpayes, nbAttendusTot, taux: totalAttendu > 0 ? totalPercu / totalAttendu * 100 : 0 }
    },
  })

  const { data: imports } = useQuery({
    queryKey: ['last-imports', agencyId],
    enabled: isDemoMode || Boolean(agencyId),
    queryFn: async () => {
      if (isDemoMode) return DEMO_BANK_IMPORTS.slice(0, 5)

      const { data } = await supabase
        .from('bank_imports')
        .select('*')
        .eq('agency_id', agencyId)
        .order('created_at', { ascending: false })
        .limit(5)
      return data ?? []
    },
  })


  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Pilotage mensuel - ${moisFr(moisIso)}`}
        actions={
          <Button asChild>
          <Link to="/import-bancaire">
            <Upload className="mr-2 h-4 w-4" />
            Importer des extraits
          </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Loyers attendus"
          value={eur(kpis?.totalAttendu ?? 0)}
          detail={`${kpis?.nbAttendusTot ?? 0} locataires suivis`}
          icon={<FileText className="h-4 w-4" />}
        />
        <MetricCard
          label="Loyers perçus"
          value={eur(kpis?.totalPercu ?? 0)}
          detail={`${(kpis?.taux ?? 0).toFixed(1)}% du total collecté`}
          tone="green"
          icon={<TrendingUp className="h-4 w-4" />}
          progress={kpis?.taux ?? 0}
        />
        <MetricCard
          label="Reste dû"
          value={eur((kpis?.totalAttendu ?? 0) - (kpis?.totalPercu ?? 0))}
          detail={`${kpis?.nbPayes ?? 0} paiement(s) validé(s)`}
          tone="amber"
          icon={<TrendingDown className="h-4 w-4" />}
        />
        <MetricCard
          label="Impayés"
          value={kpis?.nbImpayes ?? 0}
          detail="locataires à relancer"
          tone="red"
          icon={<Clock className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Derniers imports bancaires</CardTitle>
          </CardHeader>
          <CardContent>
            {(imports ?? []).length === 0 ? (
              <EmptyState
                title="Aucun import"
                description="Commencez par importer un extrait bancaire PDF pour alimenter la réconciliation."
                action={<Button asChild size="sm"><Link to="/import-bancaire">Importer un PDF</Link></Button>}
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {imports?.map(imp => (
                  <div key={imp.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                    <div>
                      <p className="max-w-[260px] truncate font-medium text-slate-950">{imp.file_name}</p>
                      <p className="text-slate-500">{dateFr(imp.created_at)} - {imp.total_movements} mouvements</p>
                    </div>
                    <Badge variant={imp.status === 'traite' ? 'success' : imp.status === 'erreur' ? 'danger' : 'warning'}>
                      {imp.status === 'traite' ? 'Traité' : imp.status === 'erreur' ? 'Erreur' : 'En cours'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
              <Link to="/import-bancaire">Voir tous les imports</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workflow mensuel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { step: 1, label: 'Importer les extraits bancaires', to: '/import-bancaire', icon: Upload },
              { step: 2, label: 'Réconcilier les paiements', to: '/reconciliation', icon: GitMerge },
              { step: 3, label: 'Encoder les frais divers', to: '/frais', icon: Receipt },
              { step: 4, label: 'Générer les décomptes PDF', to: '/decomptes', icon: FileText },
            ].map(({ step, label, to, icon: Icon }) => (
              <Link key={step} to={to} className="group flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/90 p-3 transition-all duration-200 hover:border-emerald-200 hover:bg-emerald-50/45 active:scale-[0.99]">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-sm font-semibold text-white">
                  {step}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-950">{label}</p>
                </div>
                <Icon className="h-4 w-4 text-slate-400" />
                <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
