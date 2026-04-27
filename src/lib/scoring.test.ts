import { describe, it, expect } from 'vitest'
import { scoreLocataires, canAutoCreatePayment } from './scoring'
import type { BankMovement, PaymentAlias, MonthlyExpectedRent, Locataire, Bien, RentalUnit } from '@/types/database'

const makeMovement = (overrides: Partial<BankMovement> = {}): BankMovement => ({
  id: 'm1', import_id: 'imp1',
  operation_date: '2024-01-12', value_date: null,
  direction: 'credit', amount: 1040, currency: 'EUR',
  counterparty_name: 'Moreno Coconi',
  counterparty_iban: 'BE68539007547034',
  communication: 'Loyer janvier rue paul tournay',
  raw_label: '', category: 'loyer', status: 'a_valider',
  match_score: null, suggested_locataire_id: null,
  suggested_bien_id: null, paiement_id: null,
  dedupe_hash: 'abc', notes: null,
  created_at: '', updated_at: '', ...overrides,
})

const makeBien = (): Bien => ({
  id: 'b1', proprietaire_id: 'p1', reference_interne: null,
  adresse: 'Rue Paul Tournay, 14/5 - 5030 Gembloux',
  type_bien: 'Appartement', statut: 'actif', notes: null,
  created_at: '', updated_at: '',
})

const makeUnit = (): RentalUnit & { biens: Bien } => ({
  id: 'u1', bien_id: 'b1', libelle: 'Appartement',
  loyer_mensuel: 915, charges_mensuelles: 125,
  pourcentage_honoraires: 8, taux_tva_honoraires: 21,
  base_calcul_honoraires: 'loyer_plus_charges',
  actif: true, notes: null, created_at: '', updated_at: '',
  biens: makeBien(),
})

const makeLoc = (overrides: Partial<Locataire> = {}): Locataire & { rental_units: { biens: Bien } } => ({
  id: 'l1', nom_complet: 'Moreno - Coconi', email: null, telephone: null,
  date_debut_bail: null, date_fin_bail: null, statut: 'actif',
  rental_unit_id: 'u1', loyer_mensuel_override: null, charges_mensuelles_override: null,
  notes: null, created_at: '', updated_at: '',
  rental_units: makeUnit(),
  ...overrides,
})

describe('scoreLocataires', () => {
  it('score élevé pour IBAN exact dans les aliases', () => {
    const aliases: PaymentAlias[] = [{
      id: 'a1', locataire_id: 'l1', bien_id: 'b1',
      counterparty_iban: 'BE68539007547034',
      counterparty_name_normalized: null,
      source: 'manual', times_used: 3, last_used_at: null,
      created_at: '', updated_at: '',
    }]

    const expected: MonthlyExpectedRent[] = [{
      id: 'e1', locataire_id: 'l1', rental_unit_id: 'u1',
      mois_concerne: '2024-01-01', loyer_attendu: 915, charges_attendues: 125,
    }]

    const results = scoreLocataires({
      movement: makeMovement({ amount: 1040, counterparty_iban: 'BE68539007547034' }),
      locataires: [makeLoc()],
      aliases,
      expectedRents: expected,
      currentMonth: '2024-01-01',
    })

    expect(results.length).toBe(1)
    // +60 (IBAN) + +40 (montant ≈ 1040 vs attendu 1040) + +10 (mois non payé) = 110
    expect(results[0].score).toBeGreaterThanOrEqual(90)
  })

  it('score faible sans correspondance', () => {
    const results = scoreLocataires({
      movement: makeMovement({ counterparty_name: 'Inconnu Total', counterparty_iban: 'BE00000000000000', amount: 999 }),
      locataires: [makeLoc()],
      aliases: [],
      expectedRents: [],
      currentMonth: '2024-01-01',
    })
    expect(results[0].score).toBeLessThan(50)
  })
})

describe('canAutoCreatePayment', () => {
  it('autorise si score ≥ 90 et montant exact', () => {
    expect(canAutoCreatePayment(95, 1040, 1040)).toBe(true)
    expect(canAutoCreatePayment(95, 1040.3, 1040)).toBe(true)
  })

  it('refuse si score < 90', () => {
    expect(canAutoCreatePayment(89, 1040, 1040)).toBe(false)
  })

  it('refuse si montant hors tolérance', () => {
    expect(canAutoCreatePayment(95, 1041, 1040)).toBe(false)
  })

  it('refuse si attendu null', () => {
    expect(canAutoCreatePayment(95, 1040, null)).toBe(false)
  })
})
