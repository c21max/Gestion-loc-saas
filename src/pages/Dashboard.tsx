import { useQuery } from '@tanstack/react-query'
import { isDemoMode } from '@/lib/supabase'
import { getDemoDashboardKpis, DEMO_BANK_IMPORTS } from '@/lib/demo-data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { eur, moisFr, dateFr, currentMonthStr } from '@/lib/format'
import {
  ArrowRight, Clock, FileText, GitMerge,
  Receipt, TrendingDown, TrendingUp, Upload,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'
import { EmptyState, MetricCard, PageHeader, SkeletonBlock } from '@/components/ui/page'
import { motion } from 'framer-motion'
import { getDashboardKpis, listRecentBankImports } from '@/api/dashboard.api'

const WORKFLOW_STEPS = [
  { step: 1, label: 'Importer les extraits bancaires', to: '/import-bancaire', icon: Upload, color: 'bg-slate-950' },
  { step: 2, label: 'Réconcilier les paiements', to: '/reconciliation', icon: GitMerge, color: 'bg-slate-800' },
  { step: 3, label: 'Encoder les frais divers', to: '/frais', icon: Receipt, color: 'bg-slate-700' },
  { step: 4, label: 'Générer les décomptes PDF', to: '/decomptes', icon: FileText, color: 'bg-slate-600' },
]

export function Dashboard() {
  const { agency } = useAuth()
  const agencyId = agency?.id
  const moisCourant = currentMonthStr()
  const moisIso = `${moisCourant}-01`

  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['dashboard-kpis', agencyId, moisCourant],
    enabled: isDemoMode || Boolean(agencyId),
    queryFn: async () => {
      if (isDemoMode) return getDemoDashboardKpis()
      return getDashboardKpis(agencyId, moisIso)
    },
  })

  const { data: imports } = useQuery({
    queryKey: ['last-imports', agencyId],
    enabled: isDemoMode || Boolean(agencyId),
    queryFn: async () => {
      if (isDemoMode) return DEMO_BANK_IMPORTS.slice(0, 5)
      return listRecentBankImports(agencyId)
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Pilotage mensuel — ${moisFr(moisIso)}`}
        actions={
          <Button asChild>
            <Link to="/import-bancaire">
              <Upload className="mr-2 h-4 w-4" />
              Importer des extraits
            </Link>
          </Button>
        }
      />

      {/* KPI grid */}
      {kpisLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map(i => <SkeletonBlock key={i} className="h-28" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            index={0}
            label="Loyers attendus"
            value={eur(kpis?.totalAttendu ?? 0)}
            detail={`${kpis?.nbAttendusTot ?? 0} locataires suivis`}
            icon={<FileText className="h-4 w-4" />}
          />
          <MetricCard
            index={1}
            label="Loyers perçus"
            value={eur(kpis?.totalPercu ?? 0)}
            detail={`${(kpis?.taux ?? 0).toFixed(1)}% du total collecté`}
            tone="green"
            icon={<TrendingUp className="h-4 w-4" />}
            progress={kpis?.taux ?? 0}
          />
          <MetricCard
            index={2}
            label="Reste dû"
            value={eur((kpis?.totalAttendu ?? 0) - (kpis?.totalPercu ?? 0))}
            detail={`${kpis?.nbPayes ?? 0} paiement(s) validé(s)`}
            tone="amber"
            icon={<TrendingDown className="h-4 w-4" />}
          />
          <MetricCard
            index={3}
            label="Impayés"
            value={kpis?.nbImpayes ?? 0}
            detail="locataires à relancer"
            tone="red"
            icon={<Clock className="h-4 w-4" />}
          />
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        {/* Imports */}
        <Card>
          <CardHeader>
            <CardTitle>Derniers imports bancaires</CardTitle>
          </CardHeader>
          <CardContent>
            {(imports ?? []).length === 0 ? (
              <EmptyState
                title="Aucun import bancaire"
                description="Commencez par importer un extrait bancaire PDF pour alimenter la réconciliation."
                action={
                  <Button asChild size="sm">
                    <Link to="/import-bancaire">Importer un PDF</Link>
                  </Button>
                }
              />
            ) : (
              <motion.div
                className="divide-y divide-slate-100"
                initial="hidden"
                animate="show"
                variants={{ show: { transition: { staggerChildren: 0.06 } } }}
              >
                {imports?.map(imp => (
                  <motion.div
                    key={imp.id}
                    variants={{
                      hidden: { opacity: 0, x: -8 },
                      show: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
                    }}
                    className="flex items-center justify-between gap-4 py-3.5 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-950">{imp.file_name}</p>
                      <p className="mt-0.5 text-[12px] text-slate-400">
                        {dateFr(imp.created_at)} · {imp.total_movements} mouvements
                      </p>
                    </div>
                    <Badge
                      variant={
                        imp.status === 'traite' ? 'success'
                        : imp.status === 'erreur' ? 'danger'
                        : 'warning'
                      }
                    >
                      {imp.status === 'traite' ? 'Traité' : imp.status === 'erreur' ? 'Erreur' : 'En cours'}
                    </Badge>
                  </motion.div>
                ))}
              </motion.div>
            )}
            <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
              <Link to="/import-bancaire">Voir tous les imports</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Workflow */}
        <Card>
          <CardHeader>
            <CardTitle>Workflow mensuel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {WORKFLOW_STEPS.map(({ step, label, to, icon: Icon, color }, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 + 0.2, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                <Link
                  to={to}
                  className="group flex items-center gap-3 rounded-xl border border-transparent bg-slate-50 p-3 transition-all duration-200 hover:border-slate-200 hover:bg-white hover:shadow-[0_2px_8px_-2px_rgba(15,23,42,0.08)]"
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${color} text-xs font-bold text-white`}>
                    {step}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 group-hover:text-slate-950">{label}</p>
                  </div>
                  <Icon className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500" />
                  <ArrowRight className="h-3.5 w-3.5 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" />
                </Link>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
