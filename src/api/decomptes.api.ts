import { supabase } from '@/lib/supabase'
import { requireAgencyId, throwIfError } from '@/api/errors'
import type { AgencySettings, FraisDivers, OwnerStatement, Paiement } from '@/types/database'

export async function listActivePropertiesForStatements(agencyId: string | null | undefined) {
  const scopedAgencyId = requireAgencyId(agencyId)
  const { data, error } = await supabase
    .from('biens')
    .select('*, proprietaires (*), rental_units (*)')
    .eq('agency_id', scopedAgencyId)
    .eq('statut', 'actif')
  throwIfError(error)
  return data ?? []
}

export async function listOwnerStatements(agencyId: string | null | undefined, monthIso: string) {
  const scopedAgencyId = requireAgencyId(agencyId)
  const { data, error } = await supabase
    .from('owner_statements')
    .select('*, biens (adresse), proprietaires (nom_complet)')
    .eq('agency_id', scopedAgencyId)
    .eq('mois_concerne', monthIso)
  throwIfError(error)
  return data ?? []
}

export async function getStatementLiveData(agencyId: string | null | undefined, monthIso: string) {
  const scopedAgencyId = requireAgencyId(agencyId)
  const [paiementsRes, fraisRes] = await Promise.all([
    supabase.from('paiements').select('*').eq('agency_id', scopedAgencyId).eq('mois_concerne', monthIso),
    supabase.from('frais_divers').select('*').eq('agency_id', scopedAgencyId).eq('mois_concerne', monthIso),
  ])
  throwIfError(paiementsRes.error)
  throwIfError(fraisRes.error)
  return {
    paiements: (paiementsRes.data ?? []) as Paiement[],
    frais: (fraisRes.data ?? []) as FraisDivers[],
  }
}

export async function getAgencySettings(agencyId: string | null | undefined) {
  const scopedAgencyId = requireAgencyId(agencyId)
  const { data, error } = await supabase
    .from('agency_settings')
    .select('*')
    .eq('agency_id', scopedAgencyId)
    .single()
  throwIfError(error)
  return data as AgencySettings | null
}

export async function getStatementInputsForProperty(
  agencyId: string | null | undefined,
  propertyId: string,
  monthIso: string
) {
  const scopedAgencyId = requireAgencyId(agencyId)
  const [paiementsRes, fraisRes] = await Promise.all([
    supabase
      .from('paiements')
      .select('*')
      .eq('agency_id', scopedAgencyId)
      .eq('bien_id', propertyId)
      .eq('mois_concerne', monthIso),
    supabase
      .from('frais_divers')
      .select('*')
      .eq('agency_id', scopedAgencyId)
      .eq('bien_id', propertyId)
      .eq('mois_concerne', monthIso),
  ])
  throwIfError(paiementsRes.error)
  throwIfError(fraisRes.error)
  return {
    paiements: (paiementsRes.data ?? []) as Paiement[],
    frais: (fraisRes.data ?? []) as FraisDivers[],
  }
}

export async function upsertOwnerStatement(
  agencyId: string | null | undefined,
  values: Omit<
    OwnerStatement,
    'id' | 'agency_id' | 'pdf_storage_path' | 'created_at' | 'updated_at'
  >
) {
  const scopedAgencyId = requireAgencyId(agencyId)
  const { error } = await supabase
    .from('owner_statements')
    .upsert({ ...values, agency_id: scopedAgencyId }, { onConflict: 'bien_id,mois_concerne' })
  throwIfError(error)
}
