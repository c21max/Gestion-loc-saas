import { parseBankPdf } from '@/lib/bank-parser'
import {
  createPaymentFromBankMovement,
  getImportMatchingData,
  markBankMovementAsPaymentCreated,
  updateBankImport,
  updateBankMovementSuggestion,
  upsertBankMovements,
} from '@/api/imports.api'
import type { BankMovement } from '@/types/database'

export function normalizePaymentText(value: string | null | undefined) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function scoreTenantName(movementText: string, locataireName: string) {
  const text = normalizePaymentText(movementText)
  const name = normalizePaymentText(locataireName)
  const tokens = name.split(' ').filter(token => token.length >= 3)
  if (tokens.length === 0) return 0
  if (text.includes(name)) return 60
  const hits = tokens.filter(token => text.includes(token)).length
  return Math.round((hits / tokens.length) * 55)
}

export function amountCandidates(raw: string | null | undefined, primaryAmount: number) {
  const values = new Set<number>([Number(primaryAmount)])
  const matches = [...(raw ?? '').matchAll(/\b(\d{1,3}(?:[ .]\d{3})*(?:,\d{2})|\d+,\d{2})\b/g)]
  for (const match of matches) {
    const value = Number.parseFloat(match[1].replace(/\s/g, '').replace(/\./g, '').replace(',', '.'))
    if (Number.isFinite(value) && value > 0) values.add(Math.abs(value))
  }
  return [...values]
}

export function currentAccountingMonthIso(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

export async function createPaymentsFromImportedMovements(
  agencyId: string | null | undefined,
  importId: string,
  now = new Date()
) {
  const moisConcerne = currentAccountingMonthIso(now)
  const { movements, locataires, expectedRents, existingPayments } = await getImportMatchingData(agencyId, importId, moisConcerne)
  const alreadyPaid = new Set(existingPayments.map(p => `${p.locataire_id}:${p.mois_concerne}`))
  let created = 0

  for (const movement of movements) {
    if (movement.direction !== 'credit') continue

    const movementText = [movement.counterparty_name, movement.communication, movement.raw_label].filter(Boolean).join(' ')
    const movementAmounts = amountCandidates(movement.raw_label, Number(movement.amount))

    const scored = expectedRents
      .filter(expected => !alreadyPaid.has(`${expected.locataire_id}:${moisConcerne}`))
      .map(expected => {
        const loc = locataires.find(l => l.id === expected.locataire_id)
        const attendu = Number(expected.loyer_attendu) + Number(expected.charges_attendues)
        const matchedAmount = movementAmounts
          .map(amount => ({ amount, delta: Math.abs(amount - attendu) }))
          .sort((a, b) => a.delta - b.delta)[0] ?? { amount: Number(movement.amount), delta: Math.abs(Number(movement.amount) - attendu) }
        const amountDelta = matchedAmount.delta
        const amountScore = amountDelta <= 0.5 ? 70 : matchedAmount.amount < attendu && matchedAmount.amount > attendu * 0.4 ? 25 : 0
        const textScore = loc ? scoreTenantName(movementText, loc.nom_complet) : 0
        return { expected, loc, attendu, score: amountScore + textScore, amountDelta, textScore, matchedAmount: matchedAmount.amount }
      })
      .filter(candidate => candidate.loc?.rental_units?.biens?.id)
      .sort((a, b) => b.score - a.score)

    const best = scored[0]
    const second = scored[1]
    if (!best) continue

    const isExactUniqueAmount = best.amountDelta <= 0.5 && scored.filter(c => c.amountDelta <= 0.5).length === 1
    const isExactWithSomeText = best.amountDelta <= 0.5 && best.textScore >= 15
    const isStrongTextMatch = best.textScore >= 35 && best.score >= 60 && (!second || best.score - second.score >= 15)

    if (!isExactUniqueAmount && !isExactWithSomeText && !isStrongTextMatch) {
      await updateBankMovementSuggestion(agencyId, movement.id, {
        match_score: best.score > 0 ? best.score : null,
        suggested_locataire_id: best.loc?.id ?? null,
        suggested_bien_id: best.loc?.rental_units?.biens?.id ?? null,
      })
      continue
    }

    const expected = best.expected
    const loc = best.loc
    if (!loc?.rental_units?.biens?.id) continue

    const amount = Number(best.matchedAmount)
    const expectedLoyer = Number(expected.loyer_attendu)
    const expectedCharges = Number(expected.charges_attendues)
    const loyerPaye = Math.min(amount, expectedLoyer)
    const chargesPayees = Math.min(Math.max(amount - loyerPaye, 0), expectedCharges)
    const statut = amount + 0.5 >= best.attendu ? 'paye' : 'partiel'

    const paiement = await createPaymentFromBankMovement(agencyId, {
      locataire_id: loc.id,
      rental_unit_id: loc.rental_units.id,
      bien_id: loc.rental_units.biens.id,
      mois_concerne: moisConcerne,
      date_paiement: movement.operation_date,
      loyer_htva: loyerPaye,
      charges: chargesPayees,
      total_percu: amount,
      statut,
      bank_movement_id: movement.id,
      notes: 'Paiement cree automatiquement depuis import bancaire',
    })

    await markBankMovementAsPaymentCreated(agencyId, movement.id, {
      paiement_id: paiement.id,
      match_score: Math.min(best.score, 100),
      suggested_locataire_id: loc.id,
      suggested_bien_id: loc.rental_units.biens.id,
    })

    alreadyPaid.add(`${loc.id}:${moisConcerne}`)
    created += 1
  }

  return created
}

export async function parseBankStatementLocally(
  agencyId: string | null | undefined,
  file: File,
  importId: string
) {
  const movements = await parseBankPdf(file)
  if (movements.length === 0) throw new Error('Aucun mouvement détecté dans le PDF.')

  const rows = movements.map(m => ({
    ...m,
    agency_id: agencyId,
    import_id: importId,
    match_score: null,
    suggested_locataire_id: null,
    suggested_bien_id: null,
    paiement_id: null,
  }))

  await upsertBankMovements(agencyId, rows)

  const createdPayments = await createPaymentsFromImportedMovements(agencyId, importId)
  const dates = movements.map((m: Pick<BankMovement, 'operation_date'>) => m.operation_date).sort()

  await updateBankImport(agencyId, importId, {
    status: 'traite',
    parse_method: 'text',
    total_movements: movements.length,
    matched_movements: createdPayments,
    period_start: dates[0] ?? null,
    period_end: dates[dates.length - 1] ?? null,
    notes: 'Parse local navigateur apres echec Edge Function',
  })

  return { movements: movements.length, payments: createdPayments }
}
