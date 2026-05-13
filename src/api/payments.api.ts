import { supabase } from '@/lib/supabase'
import { requireAgencyId, throwIfError } from '@/api/errors'

export async function listPaymentsWithDetails(agencyId: string | null | undefined, monthIso: string, limit = 200) {
  const scopedAgencyId = requireAgencyId(agencyId)
  const { data, error } = await supabase
    .from('paiements')
    .select('*, locataires (nom_complet), biens (adresse), rental_units (libelle)')
    .eq('agency_id', scopedAgencyId)
    .eq('mois_concerne', monthIso)
    .order('created_at', { ascending: false })
    .limit(limit)
  throwIfError(error)
  return data ?? []
}
