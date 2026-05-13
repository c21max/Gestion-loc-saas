import { supabase } from '@/lib/supabase'
import { requireAgencyId, throwIfError } from '@/api/errors'
import type { Proprietaire } from '@/types/database'

export async function listProprietaires(agencyId: string | null | undefined) {
  const scopedAgencyId = requireAgencyId(agencyId)
  const { data, error } = await supabase
    .from('proprietaires')
    .select('*, biens (id)')
    .eq('agency_id', scopedAgencyId)
    .order('nom_complet')
  throwIfError(error)
  return data ?? []
}

export async function saveProprietaire(agencyId: string | null | undefined, form: Partial<Proprietaire>) {
  if (!form.nom_complet) throw new Error('Nom obligatoire')

  if (form.id) {
    const scopedAgencyId = requireAgencyId(agencyId)
    const { error } = await supabase.from('proprietaires').update(form).eq('id', form.id).eq('agency_id', scopedAgencyId)
    throwIfError(error)
    return
  }

  const scopedAgencyId = requireAgencyId(agencyId)
  const { error } = await supabase
    .from('proprietaires')
    .insert({ ...form, agency_id: scopedAgencyId } as Omit<Proprietaire, 'id' | 'created_at' | 'updated_at'>)
  throwIfError(error)
}
