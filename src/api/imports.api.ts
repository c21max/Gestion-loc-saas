import { supabase } from '@/lib/supabase'
import { requireAgencyId, throwIfError } from '@/api/errors'
import type { BankImport, BankMovement, MonthlyExpectedRent, Paiement } from '@/types/database'

type ActiveTenantForImport = {
  id: string
  nom_complet: string
  rental_units: { id: string; biens: { id: string } }
}

export type ImportMatchingData = {
  movements: BankMovement[]
  locataires: ActiveTenantForImport[]
  expectedRents: MonthlyExpectedRent[]
  existingPayments: Pick<Paiement, 'locataire_id' | 'mois_concerne'>[]
}

export async function listBankImports(agencyId: string | null | undefined, limit = 100): Promise<BankImport[]> {
  const scopedAgencyId = requireAgencyId(agencyId)
  const { data, error } = await supabase
    .from('bank_imports')
    .select('id, agency_id, file_name, storage_path, parse_method, status, period_start, period_end, total_movements, matched_movements, ignored_movements, notes, created_at, updated_at')
    .eq('agency_id', scopedAgencyId)
    .order('created_at', { ascending: false })
    .limit(limit)
  throwIfError(error)
  return (data ?? []) as BankImport[]
}

export async function getImportMatchingData(
  agencyId: string | null | undefined,
  importId: string,
  monthIso: string
): Promise<ImportMatchingData> {
  const scopedAgencyId = requireAgencyId(agencyId)
  const [movRes, locRes, expectedRes, existingPayRes] = await Promise.all([
    supabase.from('bank_movements').select('*').eq('agency_id', scopedAgencyId).eq('import_id', importId),
    supabase
      .from('locataires')
      .select('id, nom_complet, rental_unit_id, rental_units (id, biens (id))')
      .eq('agency_id', scopedAgencyId)
      .eq('statut', 'actif'),
    supabase.from('monthly_expected_rents').select('*').eq('agency_id', scopedAgencyId).eq('mois_concerne', monthIso),
    supabase.from('paiements').select('locataire_id, mois_concerne').eq('agency_id', scopedAgencyId).eq('mois_concerne', monthIso),
  ])

  throwIfError(movRes.error)
  throwIfError(locRes.error)
  throwIfError(expectedRes.error)
  throwIfError(existingPayRes.error)

  return {
    movements: (movRes.data ?? []) as BankMovement[],
    locataires: (locRes.data ?? []) as unknown as ActiveTenantForImport[],
    expectedRents: (expectedRes.data ?? []) as MonthlyExpectedRent[],
    existingPayments: (existingPayRes.data ?? []) as Pick<Paiement, 'locataire_id' | 'mois_concerne'>[],
  }
}

export async function updateBankMovementSuggestion(
  agencyId: string | null | undefined,
  movementId: string,
  values: Pick<BankMovement, 'match_score' | 'suggested_locataire_id' | 'suggested_bien_id'>
) {
  const scopedAgencyId = requireAgencyId(agencyId)
  const { error } = await supabase
    .from('bank_movements')
    .update(values)
    .eq('id', movementId)
    .eq('agency_id', scopedAgencyId)
  throwIfError(error)
}

export async function createPaymentFromBankMovement(
  agencyId: string | null | undefined,
  values: {
    locataire_id: string
    rental_unit_id: string
    bien_id: string
    mois_concerne: string
    date_paiement: string
    loyer_htva: number
    charges: number
    total_percu: number
    statut: 'paye' | 'partiel'
    bank_movement_id: string
    notes: string
  }
): Promise<{ id: string }> {
  const scopedAgencyId = requireAgencyId(agencyId)
  const { data, error } = await supabase
    .from('paiements')
    .insert({ ...values, agency_id: scopedAgencyId })
    .select('id')
    .single()
  throwIfError(error)
  return data as { id: string }
}

export async function markBankMovementAsPaymentCreated(
  agencyId: string | null | undefined,
  movementId: string,
  values: Pick<BankMovement, 'paiement_id' | 'match_score' | 'suggested_locataire_id' | 'suggested_bien_id'>
) {
  const scopedAgencyId = requireAgencyId(agencyId)
  const { error } = await supabase
    .from('bank_movements')
    .update({ status: 'paiement_cree', ...values })
    .eq('id', movementId)
    .eq('agency_id', scopedAgencyId)
  throwIfError(error)
}

export async function upsertBankMovements(
  agencyId: string | null | undefined,
  rows: Array<Record<string, unknown>>
) {
  requireAgencyId(agencyId)
  const { error } = await supabase
    .from('bank_movements')
    .upsert(rows, { onConflict: 'import_id,dedupe_hash', ignoreDuplicates: true })
  throwIfError(error)
}

export async function updateBankImport(
  agencyId: string | null | undefined,
  importId: string,
  values: Partial<BankImport>
) {
  const scopedAgencyId = requireAgencyId(agencyId)
  const { error } = await supabase
    .from('bank_imports')
    .update(values)
    .eq('id', importId)
    .eq('agency_id', scopedAgencyId)
  throwIfError(error)
}

export async function createBankImport(
  agencyId: string | null | undefined,
  values: Pick<BankImport, 'file_name' | 'storage_path' | 'status'>
): Promise<BankImport> {
  const scopedAgencyId = requireAgencyId(agencyId)
  const { data, error } = await supabase
    .from('bank_imports')
    .insert({ ...values, agency_id: scopedAgencyId })
    .select()
    .single()
  throwIfError(error)
  return data as BankImport
}

export async function uploadBankStatement(storagePath: string, file: File) {
  const { error } = await supabase.storage
    .from('bank-statements')
    .upload(storagePath, file, { contentType: 'application/pdf' })
  throwIfError(error)
}

export async function invokeParseBankStatement(importId: string, storagePath: string) {
  return supabase.functions.invoke('parse-bank-statement', {
    body: { import_id: importId, storage_path: storagePath },
  })
}

export async function resetImportedPayments(agencyId: string | null | undefined, monthIso: string): Promise<number> {
  const scopedAgencyId = requireAgencyId(agencyId)
  const { data: importedPayments, error: paymentsFetchErr } = await supabase
    .from('paiements')
    .select('id')
    .eq('agency_id', scopedAgencyId)
    .or('bank_movement_id.not.is.null,notes.ilike.%import bancaire%')
  throwIfError(paymentsFetchErr)

  const paymentIds = (importedPayments ?? []).map(p => p.id)
  if (paymentIds.length > 0) {
    const { error } = await supabase.from('paiements').delete().eq('agency_id', scopedAgencyId).in('id', paymentIds)
    throwIfError(error)
  }

  const { error: resetMovErr } = await supabase
    .from('bank_movements')
    .update({ status: 'a_valider', paiement_id: null, match_score: null, suggested_locataire_id: null, suggested_bien_id: null })
    .eq('agency_id', scopedAgencyId)
    .in('status', ['paiement_cree', 'a_valider'])
  throwIfError(resetMovErr)

  const { error: resetImpErr } = await supabase
    .from('bank_imports')
    .update({ matched_movements: 0 })
    .eq('agency_id', scopedAgencyId)
    .eq('status', 'traite')
  throwIfError(resetImpErr)

  const { error: delStmtErr } = await supabase
    .from('owner_statements')
    .delete()
    .eq('agency_id', scopedAgencyId)
    .eq('mois_concerne', monthIso)
  throwIfError(delStmtErr)

  return paymentIds.length
}

export async function deleteBankImportWithMovements(agencyId: string | null | undefined, importId: string) {
  const scopedAgencyId = requireAgencyId(agencyId)
  const { data: importRecord, error: importErr } = await supabase
    .from('bank_imports')
    .select('storage_path')
    .eq('agency_id', scopedAgencyId)
    .eq('id', importId)
    .single()
  throwIfError(importErr)

  const { data: movements, error: movErr } = await supabase
    .from('bank_movements')
    .select('id')
    .eq('agency_id', scopedAgencyId)
    .eq('import_id', importId)
  throwIfError(movErr)

  const movementIds = (movements ?? []).map(m => m.id)
  if (movementIds.length > 0) {
    const { error } = await supabase
      .from('paiements')
      .update({ bank_movement_id: null, statut: 'en_attente' })
      .eq('agency_id', scopedAgencyId)
      .in('bank_movement_id', movementIds)
    throwIfError(error)
  }

  if (importRecord?.storage_path) {
    const { error } = await supabase.storage.from('bank-statements').remove([importRecord.storage_path])
    throwIfError(error)
  }

  const { error } = await supabase.from('bank_imports').delete().eq('agency_id', scopedAgencyId).eq('id', importId)
  throwIfError(error)
}
