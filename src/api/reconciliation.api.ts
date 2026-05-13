import { supabase } from '@/lib/supabase'
import { requireAgencyId, throwIfError } from '@/api/errors'
import type { BankMovement, LocataireAvecUnit, MonthlyExpectedRent, Paiement } from '@/types/database'

export type ReconciliationData = {
  locataires: LocataireAvecUnit[]
  expected: MonthlyExpectedRent[]
  paiements: Paiement[]
  movements: BankMovement[]
}

export async function getReconciliationData(agencyId: string | null | undefined, monthIso: string): Promise<ReconciliationData> {
  const scopedAgencyId = requireAgencyId(agencyId)
  const [locRes, merRes, paiRes, movRes] = await Promise.all([
    supabase
      .from('locataires')
      .select('*, rental_units (*, biens (*, proprietaires (*)))')
      .eq('agency_id', scopedAgencyId)
      .eq('statut', 'actif'),
    supabase.from('monthly_expected_rents').select('*').eq('agency_id', scopedAgencyId).eq('mois_concerne', monthIso),
    supabase.from('paiements').select('*').eq('agency_id', scopedAgencyId).eq('mois_concerne', monthIso),
    supabase.from('bank_movements').select('*').eq('agency_id', scopedAgencyId).eq('status', 'a_valider'),
  ])

  throwIfError(locRes.error)
  throwIfError(merRes.error)
  throwIfError(paiRes.error)
  throwIfError(movRes.error)

  return {
    locataires: (locRes.data ?? []) as LocataireAvecUnit[],
    expected: (merRes.data ?? []) as MonthlyExpectedRent[],
    paiements: (paiRes.data ?? []) as Paiement[],
    movements: (movRes.data ?? []) as BankMovement[],
  }
}

export async function createManualPaymentFromMovement(
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
    statut: 'paye'
    bank_movement_id: string
  }
) {
  const scopedAgencyId = requireAgencyId(agencyId)
  const { data, error } = await supabase
    .from('paiements')
    .insert({ ...values, agency_id: scopedAgencyId })
    .select()
    .single()
  throwIfError(error)
  return data as Paiement
}

export async function attachPaymentToMovement(
  agencyId: string | null | undefined,
  movementId: string,
  paymentId: string
) {
  const scopedAgencyId = requireAgencyId(agencyId)
  const { error } = await supabase
    .from('bank_movements')
    .update({ status: 'paiement_cree', paiement_id: paymentId })
    .eq('id', movementId)
    .eq('agency_id', scopedAgencyId)
  throwIfError(error)
}

export async function rememberPaymentAlias(
  agencyId: string | null | undefined,
  values: {
    locataire_id: string
    bien_id: string
    counterparty_iban: string
    counterparty_name_normalized: string | null
  }
) {
  const scopedAgencyId = requireAgencyId(agencyId)
  const { error } = await supabase
    .from('payment_aliases')
    .upsert({ ...values, agency_id: scopedAgencyId, source: 'manual' }, {
      onConflict: 'locataire_id,counterparty_iban,counterparty_name_normalized',
    })
  throwIfError(error)
}
