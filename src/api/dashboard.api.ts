import { supabase } from '@/lib/supabase'
import { requireAgencyId, throwIfError } from '@/api/errors'
import type { BankImport } from '@/types/database'

export async function getDashboardKpis(agencyId: string | null | undefined, monthIso: string) {
  const scopedAgencyId = requireAgencyId(agencyId)
  const [attendusRes, paiementsRes] = await Promise.all([
    supabase
      .from('monthly_expected_rents')
      .select('loyer_attendu, charges_attendues')
      .eq('agency_id', scopedAgencyId)
      .eq('mois_concerne', monthIso),
    supabase
      .from('paiements')
      .select('total_percu, statut, locataire_id')
      .eq('agency_id', scopedAgencyId)
      .eq('mois_concerne', monthIso),
  ])
  throwIfError(attendusRes.error)
  throwIfError(paiementsRes.error)

  const attendus = attendusRes.data ?? []
  const paiements = paiementsRes.data ?? []
  const totalAttendu = attendus.reduce((s, r) => s + r.loyer_attendu + r.charges_attendues, 0)
  const totalPercu = paiements.reduce((s, p) => s + p.total_percu, 0)
  const nbPayes = paiements.filter(p => p.statut === 'paye').length
  const locatairesPayants = new Set(paiements.map(p => p.locataire_id))
  const nbAttendusTot = attendus.length
  const nbImpayes = nbAttendusTot - locatairesPayants.size

  return {
    totalAttendu,
    totalPercu,
    nbPayes,
    nbImpayes,
    nbAttendusTot,
    taux: totalAttendu > 0 ? (totalPercu / totalAttendu) * 100 : 0,
  }
}

export async function listRecentBankImports(agencyId: string | null | undefined, limit = 5): Promise<BankImport[]> {
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
