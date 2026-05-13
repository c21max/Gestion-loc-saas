import { supabase } from '@/lib/supabase'
import { requireAgencyId, throwIfError } from '@/api/errors'
import type { AgencySettings } from '@/types/database'

export async function saveAgencySettings(agencyId: string | null | undefined, form: Partial<AgencySettings>) {
  const scopedAgencyId = requireAgencyId(agencyId)
  if (form.id) {
    const { error } = await supabase.from('agency_settings').update(form).eq('id', form.id).eq('agency_id', scopedAgencyId)
    throwIfError(error)
    return
  }

  const { error } = await supabase
    .from('agency_settings')
    .insert({ ...form, agency_id: scopedAgencyId, nom: form.nom ?? 'Mon Agence' })
  throwIfError(error)
}

export async function generateExpectedRents(monthsAhead: number) {
  const { error } = await supabase.rpc('generate_expected_rents', { months_ahead: monthsAhead })
  throwIfError(error)
}
