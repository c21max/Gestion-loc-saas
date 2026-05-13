import { supabase } from '@/lib/supabase'
import { requireAgencyId, throwIfError } from '@/api/errors'
import type { Bien, Locataire, Paiement, Proprietaire, RentalUnit } from '@/types/database'

export type PortefeuilleData = Proprietaire & {
  biens: (Bien & {
    rental_units: (RentalUnit & { locataires: Locataire[] })[]
  })[]
}

export async function listPortefeuille(agencyId: string | null | undefined): Promise<PortefeuilleData[]> {
  const scopedAgencyId = requireAgencyId(agencyId)
  const { data, error } = await supabase
    .from('proprietaires')
    .select(`
      *,
      biens (
        *,
        rental_units (
          *,
          locataires (*)
        )
      )
    `)
    .eq('agency_id', scopedAgencyId)
    .order('nom_complet')
  throwIfError(error)
  return (data ?? []) as PortefeuilleData[]
}

export async function listPortfolioPayments(agencyId: string | null | undefined, monthIso: string): Promise<Paiement[]> {
  const scopedAgencyId = requireAgencyId(agencyId)
  const { data, error } = await supabase
    .from('paiements')
    .select('*')
    .eq('agency_id', scopedAgencyId)
    .eq('mois_concerne', monthIso)
  throwIfError(error)
  return (data ?? []) as Paiement[]
}

export async function createPropertyWithUnit(
  agencyId: string | null | undefined,
  form: {
    proprietaire_id: string
    adresse: string
    type_bien: string
    reference_interne: string
    unit_libelle: string
    loyer_mensuel: string
    charges_mensuelles: string
  }
) {
  const scopedAgencyId = requireAgencyId(agencyId)
  if (!form.proprietaire_id) throw new Error('Propriétaire obligatoire')
  if (!form.adresse.trim()) throw new Error('Adresse obligatoire')
  if (!form.unit_libelle.trim()) throw new Error('Nom de l’unité obligatoire')

  const { data: bien, error: bienError } = await supabase
    .from('biens')
    .insert({
      agency_id: scopedAgencyId,
      proprietaire_id: form.proprietaire_id,
      adresse: form.adresse.trim(),
      type_bien: form.type_bien.trim() || null,
      reference_interne: form.reference_interne.trim() || null,
      statut: 'actif',
    })
    .select('id')
    .single()
  throwIfError(bienError)
  if (!bien) throw new Error('Bien introuvable apres creation')

  const { error: unitError } = await supabase.from('rental_units').insert({
    agency_id: scopedAgencyId,
    bien_id: bien.id,
    libelle: form.unit_libelle.trim(),
    loyer_mensuel: Number(form.loyer_mensuel || 0),
    charges_mensuelles: Number(form.charges_mensuelles || 0),
  })
  throwIfError(unitError)
}
