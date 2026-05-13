import { getStatementInputsForProperty, upsertOwnerStatement } from '@/api/decomptes.api'
import { calcDecompte } from '@/lib/decompte'
import type { RentalUnit } from '@/types/database'

type PropertyForStatement = {
  id: string
  proprietaire_id: string
  rental_units?: RentalUnit[]
}

export async function generateOwnerStatementForProperty(
  agencyId: string | null | undefined,
  monthIso: string,
  bien: PropertyForStatement
) {
  const { paiements, frais } = await getStatementInputsForProperty(agencyId, bien.id, monthIso)
  const units = bien.rental_units ?? []
  const resultat = calcDecompte(paiements, frais, units)

  await upsertOwnerStatement(agencyId, {
    proprietaire_id: bien.proprietaire_id,
    bien_id: bien.id,
    mois_concerne: monthIso,
    total_percu: resultat.paiements.total_percu,
    total_frais_tvac: resultat.frais.tvac,
    honoraires_htva: resultat.honoraires.htva,
    honoraires_tva: resultat.honoraires.tva,
    honoraires_tvac: resultat.honoraires.tvac,
    solde_proprietaire: resultat.solde_proprietaire,
    genere_le: new Date().toISOString(),
  })

  return resultat
}
