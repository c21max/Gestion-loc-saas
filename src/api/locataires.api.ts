import { supabase } from '@/lib/supabase'
import { requireAgencyId, throwIfError } from '@/api/errors'

export async function listLocatairesWithUnits(agencyId: string | null | undefined) {
  const scopedAgencyId = requireAgencyId(agencyId)
  const { data, error } = await supabase
    .from('locataires')
    .select('*, rental_units (libelle, loyer_mensuel, charges_mensuelles, biens (adresse, proprietaires (nom_complet)))')
    .eq('agency_id', scopedAgencyId)
    .order('nom_complet')
  throwIfError(error)
  return data ?? []
}

export async function listRentalUnitsForTenantSelect(agencyId: string | null | undefined) {
  const scopedAgencyId = requireAgencyId(agencyId)
  const { data, error } = await supabase
    .from('rental_units')
    .select('id, libelle, loyer_mensuel, charges_mensuelles, biens (id, adresse, proprietaire_id)')
    .eq('agency_id', scopedAgencyId)
    .eq('actif', true)
    .order('libelle')
  throwIfError(error)
  return data ?? []
}

export async function listCurrentTenantPaymentTotals(agencyId: string | null | undefined, monthIso: string) {
  const scopedAgencyId = requireAgencyId(agencyId)
  const { data, error } = await supabase
    .from('paiements')
    .select('locataire_id, total_percu')
    .eq('agency_id', scopedAgencyId)
    .eq('mois_concerne', monthIso)
  throwIfError(error)
  return data ?? []
}

export async function createLocataire(
  agencyId: string | null | undefined,
  form: {
    rental_unit_id: string
    nom_complet: string
    email: string
    telephone: string
    date_debut_bail: string
    date_fin_bail: string
    loyer_mensuel_override: string
    charges_mensuelles_override: string
  }
) {
  const scopedAgencyId = requireAgencyId(agencyId)
  if (!form.rental_unit_id) throw new Error('Unité locative obligatoire')
  if (!form.nom_complet.trim()) throw new Error('Nom obligatoire')

  const { error } = await supabase.from('locataires').insert({
    agency_id: scopedAgencyId,
    rental_unit_id: form.rental_unit_id,
    nom_complet: form.nom_complet.trim(),
    email: form.email.trim() || null,
    telephone: form.telephone.trim() || null,
    date_debut_bail: form.date_debut_bail || null,
    date_fin_bail: form.date_fin_bail || null,
    statut: 'actif',
    loyer_mensuel_override: form.loyer_mensuel_override ? Number(form.loyer_mensuel_override) : null,
    charges_mensuelles_override: form.charges_mensuelles_override ? Number(form.charges_mensuelles_override) : null,
  })
  throwIfError(error)
}
