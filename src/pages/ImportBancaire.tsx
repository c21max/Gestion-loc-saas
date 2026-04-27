import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isDemoMode } from '@/lib/supabase'
import { DEMO_BANK_IMPORTS } from '@/lib/demo-data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Upload, Trash2, FileText, AlertTriangle, RefreshCw } from 'lucide-react'
import { dateFr } from '@/lib/format'
import { parseBankPdf } from '@/lib/bank-parser'
import { useToast } from '@/hooks/use-toast'
import type { BankImport } from '@/types/database'
import { useAuth } from '@/lib/auth'
import { EmptyState, PageHeader, SkeletonBlock } from '@/components/ui/page'

function normalizeText(value: string | null | undefined) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function nameScore(movementText: string, locataireName: string) {
  const text = normalizeText(movementText)
  const name = normalizeText(locataireName)
  const tokens = name.split(' ').filter(token => token.length >= 3)
  if (tokens.length === 0) return 0
  if (text.includes(name)) return 60

  const hits = tokens.filter(token => text.includes(token)).length
  return Math.round((hits / tokens.length) * 55)
}

function amountCandidates(raw: string | null | undefined, primaryAmount: number) {
  const values = new Set<number>([Number(primaryAmount)])
  const matches = [...(raw ?? '').matchAll(/\b(\d{1,3}(?:[ .]\d{3})*(?:,\d{2})|\d+,\d{2})\b/g)]

  for (const match of matches) {
    const value = Number.parseFloat(match[1].replace(/\s/g, '').replace(/\./g, '').replace(',', '.'))
    if (Number.isFinite(value) && value > 0) values.add(Math.abs(value))
  }

  return [...values]
}

export function ImportBancaire() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const { agency } = useAuth()
  const agencyId = agency?.id
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)

  const createPaymentsFromMovements = useCallback(async (importId: string) => {
    if (!agencyId) throw new Error('Aucune agence active')
    const now = new Date()
    const moisConcerne = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

    const [movRes, locRes, expectedRes, existingPayRes] = await Promise.all([
      supabase
        .from('bank_movements')
        .select('*')
        .eq('agency_id', agencyId)
        .eq('import_id', importId),
      supabase
        .from('locataires')
        .select('id, nom_complet, rental_unit_id, rental_units (id, biens (id))')
        .eq('agency_id', agencyId)
        .eq('statut', 'actif'),
      supabase
        .from('monthly_expected_rents')
        .select('*')
        .eq('agency_id', agencyId)
        .eq('mois_concerne', moisConcerne),
      supabase
        .from('paiements')
        .select('locataire_id, mois_concerne')
        .eq('agency_id', agencyId)
        .eq('mois_concerne', moisConcerne),
    ])

    if (movRes.error) throw movRes.error
    if (locRes.error) throw locRes.error
    if (expectedRes.error) throw expectedRes.error
    if (existingPayRes.error) throw existingPayRes.error

    const alreadyPaid = new Set((existingPayRes.data ?? []).map(p => `${p.locataire_id}:${p.mois_concerne}`))
    let created = 0

    for (const movement of movRes.data ?? []) {
      if (movement.direction !== 'credit') continue

      const movementText = [
        movement.counterparty_name,
        movement.communication,
        movement.raw_label,
      ].filter(Boolean).join(' ')
      const movementAmounts = amountCandidates(movement.raw_label, Number(movement.amount))

      const scored = (expectedRes.data ?? [])
        .filter(expected => !alreadyPaid.has(`${expected.locataire_id}:${moisConcerne}`))
        .map(expected => {
          const loc = (locRes.data ?? []).find(l => l.id === expected.locataire_id) as
            | { id: string; nom_complet: string; rental_units: { id: string; biens: { id: string } } }
            | undefined
          const attendu = Number(expected.loyer_attendu) + Number(expected.charges_attendues)
          const matchedAmount = movementAmounts
            .map(amount => ({ amount, delta: Math.abs(amount - attendu) }))
            .sort((a, b) => a.delta - b.delta)[0] ?? { amount: Number(movement.amount), delta: Math.abs(Number(movement.amount) - attendu) }
          const amountDelta = matchedAmount.delta
          const amountScore = amountDelta <= 0.5 ? 70 : matchedAmount.amount < attendu && matchedAmount.amount > attendu * 0.4 ? 25 : 0
          const textScore = loc ? nameScore(movementText, loc.nom_complet) : 0
          return { expected, loc, attendu, score: amountScore + textScore, amountDelta, textScore, matchedAmount: matchedAmount.amount }
        })
        .filter(candidate => candidate.loc?.rental_units?.biens?.id)
        .sort((a, b) => b.score - a.score)

      const best = scored[0]
      const second = scored[1]
      if (!best) continue

      const isExactUniqueAmount =
        best.amountDelta <= 0.5 &&
        scored.filter(candidate => candidate.amountDelta <= 0.5).length === 1
      const isExactWithSomeText = best.amountDelta <= 0.5 && best.textScore >= 15
      const isStrongTextMatch = best.textScore >= 35 && best.score >= 60 && (!second || best.score - second.score >= 15)

      if (!isExactUniqueAmount && !isExactWithSomeText && !isStrongTextMatch) {
        await supabase
          .from('bank_movements')
          .update({
            match_score: best.score > 0 ? best.score : null,
            suggested_locataire_id: best.loc?.id ?? null,
            suggested_bien_id: best.loc?.rental_units?.biens?.id ?? null,
          })
          .eq('id', movement.id)
          .eq('agency_id', agencyId)
        continue
      }

      const expected = best.expected
      const loc = best.loc
      if (!loc?.rental_units?.biens?.id) continue
      const amount = Number(best.matchedAmount)
      const expectedLoyer = Number(expected.loyer_attendu)
      const expectedCharges = Number(expected.charges_attendues)
      const loyerPaye = Math.min(amount, expectedLoyer)
      const chargesPayees = Math.min(Math.max(amount - loyerPaye, 0), expectedCharges)
      const statut = amount + 0.5 >= best.attendu ? 'paye' : 'partiel'

      const { data: paiement, error: paiementErr } = await supabase
        .from('paiements')
        .insert({
          agency_id: agencyId,
          locataire_id: loc.id,
          rental_unit_id: loc.rental_units.id,
          bien_id: loc.rental_units.biens.id,
          mois_concerne: moisConcerne,
          date_paiement: movement.operation_date,
          loyer_htva: loyerPaye,
          charges: chargesPayees,
          total_percu: amount,
          statut,
          bank_movement_id: movement.id,
          notes: 'Paiement cree automatiquement depuis import bancaire',
        })
        .select('id')
        .single()
      if (paiementErr) throw paiementErr

      await supabase
        .from('bank_movements')
        .update({
          status: 'paiement_cree',
          paiement_id: paiement.id,
          match_score: Math.min(best.score, 100),
          suggested_locataire_id: loc.id,
          suggested_bien_id: loc.rental_units.biens.id,
        })
        .eq('id', movement.id)
        .eq('agency_id', agencyId)

      alreadyPaid.add(`${loc.id}:${moisConcerne}`)
      created += 1
    }

    return created
  }, [agencyId])

  const parseLocally = useCallback(async (file: File, importId: string) => {
    const movements = await parseBankPdf(file)
    if (movements.length === 0) throw new Error('Aucun mouvement détecté dans le PDF.')

    const rows = movements.map(m => ({
      ...m,
      agency_id: agencyId,
      import_id: importId,
      match_score: null,
      suggested_locataire_id: null,
      suggested_bien_id: null,
      paiement_id: null,
    }))

    const { error: insertErr } = await supabase
      .from('bank_movements')
      .upsert(rows, { onConflict: 'import_id,dedupe_hash', ignoreDuplicates: true })
    if (insertErr) throw insertErr

    const createdPayments = await createPaymentsFromMovements(importId)
    const dates = movements.map(m => m.operation_date).sort()
    const { error: updateErr } = await supabase
      .from('bank_imports')
      .update({
        status: 'traite',
        parse_method: 'text',
        total_movements: movements.length,
        matched_movements: createdPayments,
        period_start: dates[0] ?? null,
        period_end: dates[dates.length - 1] ?? null,
        notes: 'Parse local navigateur apres echec Edge Function',
      })
      .eq('id', importId)
      .eq('agency_id', agencyId)
    if (updateErr) throw updateErr

    return { movements: movements.length, payments: createdPayments }
  }, [agencyId, createPaymentsFromMovements])

  const { data: imports, isLoading } = useQuery({
    queryKey: ['bank-imports', agencyId],
    enabled: isDemoMode || Boolean(agencyId),
    queryFn: async () => {
      if (isDemoMode) return DEMO_BANK_IMPORTS

      const { data, error } = await supabase
        .from('bank_imports')
        .select('*')
        .eq('agency_id', agencyId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as BankImport[]
    },
  })

  const repairMutation = useMutation({
    mutationFn: async () => {
      if (!imports?.length) return 0
      const results = await Promise.all(
        imports.filter(imp => imp.status === 'traite').map(imp => createPaymentsFromMovements(imp.id))
      )
      return results.reduce((sum, n) => sum + n, 0)
    },
    onSuccess: created => {
      qc.invalidateQueries({ queryKey: ['bank-imports', agencyId] })
      qc.invalidateQueries({ queryKey: ['paiements', agencyId] })
      qc.invalidateQueries({ queryKey: ['decomptes-live-data', agencyId] })
      qc.invalidateQueries({ queryKey: ['owner-statements', agencyId] })
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
      const now = new Date()
      const moisConcerne = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

      const { data: importedPayments, error: paymentsFetchErr } = await supabase
        .from('paiements')
        .select('id')
        .eq('agency_id', agencyId)
        .or('bank_movement_id.not.is.null,notes.ilike.%import bancaire%')
      if (paymentsFetchErr) throw paymentsFetchErr

      const paymentIds = (importedPayments ?? []).map(p => p.id)
      if (paymentIds.length > 0) {
        const { error: deletePaymentsErr } = await supabase
          .from('paiements')
          .delete()
          .eq('agency_id', agencyId)
          .in('id', paymentIds)
        if (deletePaymentsErr) throw deletePaymentsErr
      }

      const { error: resetMovementsErr } = await supabase
        .from('bank_movements')
        .update({
          status: 'a_valider',
          paiement_id: null,
          match_score: null,
          suggested_locataire_id: null,
          suggested_bien_id: null,
        })
        .eq('agency_id', agencyId)
        .in('status', ['paiement_cree', 'a_valider'])
      if (resetMovementsErr) throw resetMovementsErr

      const { error: resetImportsErr } = await supabase
        .from('bank_imports')
        .update({ matched_movements: 0 })
        .eq('agency_id', agencyId)
        .eq('status', 'traite')
      if (resetImportsErr) throw resetImportsErr

      const { error: deleteStatementsErr } = await supabase
        .from('owner_statements')
        .delete()
        .eq('agency_id', agencyId)
        .eq('mois_concerne', moisConcerne)
      if (deleteStatementsErr) throw deleteStatementsErr

      return paymentIds.length
    },
    onSuccess: deleted => {
      qc.invalidateQueries({ queryKey: ['bank-imports', agencyId] })
      qc.invalidateQueries({ queryKey: ['paiements', agencyId] })
      qc.invalidateQueries({ queryKey: ['reconciliation', agencyId] })
      qc.invalidateQueries({ queryKey: ['decomptes-live-data', agencyId] })
      qc.invalidateQueries({ queryKey: ['owner-statements', agencyId] })
      toast({
        title: 'Paiements importés supprimés',
        description: `${deleted} paiement(s) supprimé(s). Tu peux retraiter ou réimporter le PDF.`,
      })
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
      const { error: uploadErr } = await supabase.storage
        .from('bank-statements')
        .upload(storagePath, file, { contentType: 'application/pdf' })
      if (uploadErr) throw uploadErr

      const { data: importRecord, error: dbErr } = await supabase
        .from('bank_imports')
        .insert({ agency_id: agencyId, file_name: file.name, storage_path: storagePath, status: 'en_cours' })
        .select()
        .single()
      if (dbErr) throw dbErr

      const { error: fnErr } = await supabase.functions.invoke('parse-bank-statement', {
        body: { import_id: importRecord.id, storage_path: storagePath },
      })
      if (fnErr) {
        try {
          const result = await parseLocally(file, importRecord.id)
          toast({
            title: 'Import traité localement',
            description: `${result.movements} mouvement(s) extraits, ${result.payments} paiement(s) créé(s).`,
          })
        } catch (localErr) {
          const message = localErr instanceof Error ? localErr.message : fnErr.message
          await supabase
            .from('bank_imports')
            .update({ status: 'erreur', notes: `${fnErr.message} | Fallback local: ${message}` })
            .eq('id', importRecord.id)
            .eq('agency_id', agencyId)
          toast({
            title: 'Parsing échoué',
            description: message,
            variant: 'destructive',
          })
        }
      } else {
        const createdPayments = await createPaymentsFromMovements(importRecord.id)
        if (createdPayments > 0) {
          await supabase.from('bank_imports').update({ matched_movements: createdPayments }).eq('id', importRecord.id).eq('agency_id', agencyId)
        }
        toast({ title: 'Import réussi', description: `${file.name} importé et parsé avec succès.` })
      }

      qc.invalidateQueries({ queryKey: ['bank-imports', agencyId] })
      qc.invalidateQueries({ queryKey: ['paiements', agencyId] })
      qc.invalidateQueries({ queryKey: ['decomptes-live-data', agencyId] })
      qc.invalidateQueries({ queryKey: ['owner-statements', agencyId] })
    } catch (err: unknown) {
      toast({ title: 'Erreur upload', description: err instanceof Error ? err.message : 'Erreur inconnue', variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }, [agencyId, createPaymentsFromMovements, parseLocally, toast, qc])

  const deleteMutation = useMutation({
    mutationFn: async (importId: string) => {
      if (isDemoMode) {
        toast({ title: 'Mode démo', description: 'Connectez Supabase pour activer cette action.' })
        return
      }

      const { data: importRecord, error: importErr } = await supabase
        .from('bank_imports')
        .select('storage_path')
        .eq('agency_id', agencyId)
        .eq('id', importId)
        .single()
      if (importErr) throw importErr

      const { data: movements, error: movErr } = await supabase
        .from('bank_movements')
        .select('id')
        .eq('agency_id', agencyId)
        .eq('import_id', importId)
      if (movErr) throw movErr

      const movementIds = (movements ?? []).map(m => m.id)
      if (movementIds.length > 0) {
        const { error: payErr } = await supabase
          .from('paiements')
          .update({ bank_movement_id: null, statut: 'en_attente' })
          .eq('agency_id', agencyId)
          .in('bank_movement_id', movementIds)
        if (payErr) throw payErr
      }

      if (importRecord.storage_path) {
        const { error: storageErr } = await supabase.storage
          .from('bank-statements')
          .remove([importRecord.storage_path])
        if (storageErr) throw storageErr
      }

      const { error: deleteErr } = await supabase
        .from('bank_imports')
        .delete()
        .eq('agency_id', agencyId)
        .eq('id', importId)
      if (deleteErr) throw deleteErr
    },
    onSuccess: () => {
      if (!isDemoMode) {
        toast({ title: 'Import supprimé' })
        qc.invalidateQueries({ queryKey: ['bank-imports', agencyId] })
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
        description="Déposez un extrait bancaire PDF, puis validez les mouvements ambigus dans la réconciliation."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => repairMutation.mutate()}
              disabled={isDemoMode || repairMutation.isPending || !imports?.length}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${repairMutation.isPending ? 'animate-spin' : ''}`} />
              Retraiter
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => resetImportedPaymentsMutation.mutate()}
              disabled={isDemoMode || resetImportedPaymentsMutation.isPending}
              className="text-rose-600 hover:text-rose-700"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Réinitialiser
            </Button>
          </>
        }
      />

      <Card
        className={`relative cursor-pointer overflow-hidden border-2 border-dashed transition-all duration-200 ${dragOver ? 'border-emerald-500 bg-emerald-50/70 shadow-[0_24px_48px_-34px_rgba(4,120,87,0.8)]' : 'border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/25'}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <CardContent className="relative flex flex-col items-center justify-center py-14">
          <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${dragOver ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-500'}`}>
            <Upload className="h-7 w-7" />
          </div>
          <p className="text-lg font-semibold text-slate-950">Déposer un extrait PDF</p>
          <p className="mt-1 text-sm text-slate-500">Glissez le fichier ici ou cliquez pour parcourir votre Mac.</p>
          <p className="mt-2 text-xs text-slate-400">Crelan et BNP sont pris en charge. Les ambiguïtés restent à valider.</p>
          {isDemoMode && (
            <p className="mt-2 text-xs font-medium text-amber-600">Upload désactivé en mode démo</p>
          )}
          {!isDemoMode && (
            <input
              type="file"
              accept=".pdf"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              disabled={uploading}
            />
          )}
          {uploading && (
            <div className="mt-5 flex items-center gap-2 text-sm text-slate-700">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-slate-950" />
              Upload et parsing en cours…
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div>
          <span className="font-medium text-amber-900">Parsing local</span>
          <span className="ml-1 text-amber-800">L'extraction se fait dans le navigateur. Les mouvements ambigus restent à valider dans la réconciliation.</span>
        </div>
      </div>

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
              <EmptyState title="Aucun import bancaire" description="Importez votre premier extrait pour créer les mouvements à valider." />
            </div>
          ) : (
            <table className="table-pro">
              <thead>
                <tr>
                  {['Fichier', 'Date import', 'Période', 'Mouvements', 'Méthode', 'Statut', 'Actions'].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {(imports ?? []).map(imp => (
                  <tr key={imp.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="max-w-[260px] truncate font-medium text-slate-950">{imp.file_name}</span>
                      </div>
                    </td>
                    <td>{dateFr(imp.created_at)}</td>
                    <td className="text-slate-500">
                      {imp.period_start ? `${dateFr(imp.period_start)} - ${dateFr(imp.period_end)}` : '—'}
                    </td>
                    <td>
                      <span className="font-medium">{imp.total_movements}</span>
                      {imp.matched_movements > 0 && <span className="ml-1 text-emerald-600">({imp.matched_movements} matchés)</span>}
                    </td>
                    <td>
                      <Badge variant="outline">{imp.parse_method}</Badge>
                    </td>
                    <td>
                      <Badge variant={imp.status === 'traite' ? 'success' : imp.status === 'erreur' ? 'danger' : 'warning'}>
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
                        className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
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
