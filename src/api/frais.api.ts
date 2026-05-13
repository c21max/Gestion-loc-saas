import { supabase } from '@/lib/supabase'
import { requireAgencyId, throwIfError } from '@/api/errors'

export async function listBiensForFeeSelect(agencyId: string | null | undefined) {
  const scopedAgencyId = requireAgencyId(agencyId)
  const { data, error } = await supabase
    .from('biens')
    .select('id, adresse, rental_units (id, libelle)')
    .eq('agency_id', scopedAgencyId)
    .eq('statut', 'actif')
  throwIfError(error)
  return data ?? []
}

export async function listFraisForMonth(agencyId: string | null | undefined, monthIso: string) {
  const scopedAgencyId = requireAgencyId(agencyId)
  const { data, error } = await supabase
    .from('frais_divers')
    .select('*, biens (adresse), rental_units (libelle)')
    .eq('agency_id', scopedAgencyId)
    .eq('mois_concerne', monthIso)
    .order('date_frais', { ascending: false })
  throwIfError(error)
  return data ?? []
}

export async function createFrais(
  agencyId: string | null | undefined,
  monthIso: string,
  form: {
    bien_id: string
    rental_unit_id: string
    libelle: string
    montant_htva: string
    taux_tva: string
    date_frais: string
    paye_par_agence: boolean
    refacturable: boolean
  }
) {
  const scopedAgencyId = requireAgencyId(agencyId)
  const htva = parseFloat(form.montant_htva)
  const tvaRate = parseFloat(form.taux_tva) / 100
  const tva = Math.round(htva * tvaRate * 100) / 100
  const tvac = Math.round((htva + tva) * 100) / 100

  const { error } = await supabase.from('frais_divers').insert({
    agency_id: scopedAgencyId,
    bien_id: form.bien_id,
    rental_unit_id: form.rental_unit_id || null,
    mois_concerne: monthIso,
    date_frais: form.date_frais,
    libelle: form.libelle,
    montant_htva: htva,
    taux_tva: parseFloat(form.taux_tva),
    montant_tva: tva,
    montant_tvac: tvac,
    paye_par_agence: form.paye_par_agence,
    refacturable: form.refacturable,
  })
  throwIfError(error)
}

export async function deleteFrais(agencyId: string | null | undefined, id: string) {
  const scopedAgencyId = requireAgencyId(agencyId)
  const { error } = await supabase.from('frais_divers').delete().eq('id', id).eq('agency_id', scopedAgencyId)
  throwIfError(error)
}
