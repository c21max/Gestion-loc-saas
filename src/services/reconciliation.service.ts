import {
  attachPaymentToMovement,
  createManualPaymentFromMovement,
  rememberPaymentAlias,
} from '@/api/reconciliation.api'
import type { BankMovement } from '@/types/database'

type LocataireForManualPayment = {
  id: string
  rental_units: { id: string; biens: { id: string } }
}

export async function assignMovementToTenant(options: {
  agencyId: string | null | undefined
  movement: BankMovement
  locataire: LocataireForManualPayment
  month: string
  rememberAlias: boolean
}) {
  const { agencyId, movement, locataire, month, rememberAlias } = options
  const paiement = await createManualPaymentFromMovement(agencyId, {
    locataire_id: locataire.id,
    rental_unit_id: locataire.rental_units.id,
    bien_id: locataire.rental_units.biens.id,
    mois_concerne: `${month}-01`,
    date_paiement: movement.operation_date,
    loyer_htva: movement.amount,
    charges: 0,
    total_percu: movement.amount,
    statut: 'paye',
    bank_movement_id: movement.id,
  })

  await attachPaymentToMovement(agencyId, movement.id, paiement.id)

  if (rememberAlias && movement.counterparty_iban) {
    await rememberPaymentAlias(agencyId, {
      locataire_id: locataire.id,
      bien_id: locataire.rental_units.biens.id,
      counterparty_iban: movement.counterparty_iban,
      counterparty_name_normalized: movement.counterparty_name ?? null,
    })
  }
}
