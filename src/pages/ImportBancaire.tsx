import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { isDemoMode } from '@/lib/supabase'
import { DEMO_BANK_IMPORTS } from '@/lib/demo-data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Upload, Trash2, FileText, Info, RefreshCw } from 'lucide-react'
import { dateFr } from '@/lib/format'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/lib/auth'
import { EmptyState, PageHeader, SkeletonBlock } from '@/components/ui/page'
import { motion, AnimatePresence } from 'framer-motion'
import { invalidateAccountingData, queryKeys } from '@/api/queryKeys'
import {
  createBankImport,
  deleteBankImportWithMovements,
  invokeParseBankStatement,
  listBankImports,
  resetImportedPayments,
  updateBankImport,
  uploadBankStatement,
} from '@/api/imports.api'
import {
  createPaymentsFromImportedMovements,
  currentAccountingMonthIso,
  parseBankStatementLocally,
} from '@/services/import-bancaire.service'

export function ImportBancaire() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const { agency } = useAuth()
  const agencyId = agency?.id
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)

  const { data: imports, isLoading } = useQuery({
    queryKey: queryKeys.bankImports(agencyId),
    enabled: isDemoMode || Boolean(agencyId),
    queryFn: async () => {
      if (isDemoMode) return DEMO_BANK_IMPORTS
      return listBankImports(agencyId)
    },
  })

  const repairMutation = useMutation({
    mutationFn: async () => {
      if (!imports?.length) return 0
      const results = await Promise.all(
        imports.filter(imp => imp.status === 'traite').map(imp => createPaymentsFromImportedMovements(agencyId, imp.id))
      )
      return results.reduce((sum, n) => sum + n, 0)
    },
    onSuccess: created => {
      invalidateAccountingData(qc, agencyId)
      toast({
        title: created > 0 ? 'Paiements créés' : 'Aucun paiement créé',
        description: created > 0
          ? `${created} paiement(s) créé(s) depuis les mouvements importés.`
          : 'Les mouvements importés restent à affecter dans la réconciliation.',
      })
    },
    onError: (err: Error) => toast({ title: 'Retraitement impossible', description: err.message, variant: 'destructive' }),
  })

  const resetImportedPaymentsMutation = useMutation({
    mutationFn: async () => {
      return resetImportedPayments(agencyId, currentAccountingMonthIso())
    },
    onSuccess: deleted => {
      invalidateAccountingData(qc, agencyId)
      toast({ title: 'Paiements importés supprimés', description: `${deleted} paiement(s) supprimé(s).` })
    },
    onError: (err: Error) => toast({ title: 'Réinitialisation impossible', description: err.message, variant: 'destructive' }),
  })

  const handleFile = useCallback(async (file: File) => {
    if (isDemoMode) {
      toast({ title: 'Mode démo', description: 'Connectez Supabase pour importer des extraits bancaires.' })
      return
    }
    if (file.type !== 'application/pdf') {
      toast({ title: 'Fichier invalide', description: 'Seuls les PDF sont acceptés.', variant: 'destructive' })
      return
    }
    setUploading(true)
    try {
      if (!agencyId) throw new Error('Aucune agence active')
      const storagePath = `${agencyId}/imports/${Date.now()}_${file.name}`
      await uploadBankStatement(storagePath, file)

      const importRecord = await createBankImport(agencyId, { file_name: file.name, storage_path: storagePath, status: 'en_cours' })

      const { error: fnErr } = await invokeParseBankStatement(importRecord.id, storagePath)
      if (fnErr) {
        try {
          const result = await parseBankStatementLocally(agencyId, file, importRecord.id)
          toast({ title: 'Import traité', description: `${result.movements} mouvement(s), ${result.payments} paiement(s) créé(s).` })
        } catch (localErr) {
          const message = localErr instanceof Error ? localErr.message : fnErr.message
          await updateBankImport(agencyId, importRecord.id, { status: 'erreur', notes: `${fnErr.message} | Fallback: ${message}` })
          toast({ title: 'Parsing échoué', description: message, variant: 'destructive' })
        }
      } else {
        const createdPayments = await createPaymentsFromImportedMovements(agencyId, importRecord.id)
        if (createdPayments > 0) {
          await updateBankImport(agencyId, importRecord.id, { matched_movements: createdPayments })
        }
        toast({ title: 'Import réussi', description: `${file.name} importé avec succès.` })
      }

      invalidateAccountingData(qc, agencyId)
    } catch (err: unknown) {
      toast({ title: 'Erreur upload', description: err instanceof Error ? err.message : 'Erreur inconnue', variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }, [agencyId, toast, qc])

  const deleteMutation = useMutation({
    mutationFn: async (importId: string) => {
      if (isDemoMode) {
        toast({ title: 'Mode démo', description: 'Connectez Supabase pour activer cette action.' })
        return
      }
      await deleteBankImportWithMovements(agencyId, importId)
    },
    onSuccess: () => {
      if (!isDemoMode) {
        toast({ title: 'Import supprimé' })
        invalidateAccountingData(qc, agencyId)
      }
    },
    onError: (err: Error) => toast({ title: 'Erreur suppression', description: err.message, variant: 'destructive' }),
  })

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import bancaire"
        description="Déposez un extrait bancaire PDF — les mouvements ambigus sont à valider dans la réconciliation."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => repairMutation.mutate()}
              disabled={isDemoMode || repairMutation.isPending || !imports?.length}
            >
              <RefreshCw className={`mr-2 h-3.5 w-3.5 ${repairMutation.isPending ? 'animate-spin' : ''}`} />
              Retraiter
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => resetImportedPaymentsMutation.mutate()}
              disabled={isDemoMode || resetImportedPaymentsMutation.isPending}
              className="text-rose-600 hover:text-rose-700"
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Réinitialiser
            </Button>
          </>
        }
      />

      {/* Drop zone */}
      <motion.div
        animate={dragOver ? { scale: 1.01 } : { scale: 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className="relative"
      >
        <div className={`relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-200 ${
          dragOver
            ? 'border-slate-800 bg-slate-50 shadow-[0_8px_32px_-8px_rgba(15,23,42,0.2)]'
            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
        }`}>
          <div className="relative flex flex-col items-center justify-center py-16">
            <AnimatePresence mode="wait">
              {dragOver ? (
                <motion.div
                  key="drag"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_8px_24px_-8px_rgba(15,23,42,0.6)]"
                >
                  <Upload className="h-7 w-7" />
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"
                >
                  <Upload className="h-7 w-7" />
                </motion.div>
              )}
            </AnimatePresence>

            <p className="text-base font-semibold text-slate-950">
              {dragOver ? 'Relâchez pour importer' : 'Déposer un extrait PDF'}
            </p>
            <p className="mt-1.5 text-sm text-slate-500">
              Glissez le fichier ici ou cliquez pour parcourir
            </p>
            <p className="mt-1 text-xs text-slate-400">Crelan et BNP pris en charge · Les ambiguïtés restent à valider</p>

            {isDemoMode && (
              <p className="mt-3 text-xs font-medium text-amber-600">Upload désactivé en mode démo</p>
            )}

            {!isDemoMode && (
              <input
                type="file"
                accept=".pdf"
                className="absolute inset-0 cursor-pointer opacity-0"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                disabled={uploading}
              />
            )}

            <AnimatePresence>
              {uploading && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="mt-6 flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm"
                >
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
                  Upload et parsing en cours…
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <div className="text-slate-600">
          <span className="font-medium text-slate-800">Parsing local : </span>
          L'extraction se fait dans le navigateur. Les mouvements ambigus restent à valider dans la réconciliation.
        </div>
      </div>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des imports</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              <SkeletonBlock className="h-10" />
              <SkeletonBlock className="h-10" />
              <SkeletonBlock className="h-10" />
            </div>
          ) : (imports ?? []).length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="Aucun import bancaire"
                description="Importez votre premier extrait pour créer les mouvements à valider."
              />
            </div>
          ) : (
            <table className="table-pro">
              <thead>
                <tr>
                  {['Fichier', 'Date', 'Période', 'Mouvements', 'Méthode', 'Statut', ''].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(imports ?? []).map(imp => (
                  <tr key={imp.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-slate-300" />
                        <span className="max-w-[220px] truncate font-medium text-slate-950">{imp.file_name}</span>
                      </div>
                    </td>
                    <td className="text-slate-500">{dateFr(imp.created_at)}</td>
                    <td className="text-slate-400">
                      {imp.period_start
                        ? `${dateFr(imp.period_start)} — ${dateFr(imp.period_end)}`
                        : '—'}
                    </td>
                    <td>
                      <span className="font-medium text-slate-950">{imp.total_movements}</span>
                      {imp.matched_movements > 0 && (
                        <span className="ml-1.5 text-[12px] text-emerald-600">
                          ({imp.matched_movements} matchés)
                        </span>
                      )}
                    </td>
                    <td>
                      <Badge variant="outline" className="text-[11px]">{imp.parse_method}</Badge>
                    </td>
                    <td>
                      <Badge variant={
                        imp.status === 'traite' ? 'success'
                        : imp.status === 'erreur' ? 'danger'
                        : 'warning'
                      }>
                        {imp.status === 'traite' ? 'Traité' : imp.status === 'erreur' ? 'Erreur' : 'En cours'}
                      </Badge>
                    </td>
                    <td>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (isDemoMode) {
                            toast({ title: 'Mode démo', description: 'Connectez Supabase pour activer cette action.' })
                            return
                          }
                          if (confirm(`Supprimer l'import "${imp.file_name}" et tous ses mouvements ?`))
                            deleteMutation.mutate(imp.id)
                        }}
                        className="text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
