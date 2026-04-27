import { describe, it, expect } from 'vitest'
import { sumPaiements, sumFrais, calcHonoraires, calcSolde, calcDecompte } from './decompte'
import type { Paiement, FraisDivers, RentalUnit } from '@/types/database'

const makePaiement = (overrides: Partial<Paiement> = {}): Paiement => ({
  id: '1', locataire_id: 'l1', rental_unit_id: 'u1', bien_id: 'b1',
  mois_concerne: '2024-01-01', date_paiement: '2024-01-10',
  loyer_htva: 900, charges: 100, indemnites: 0, degats_locatifs: 0,
  garantie_locative: 0, total_percu: 1000, statut: 'paye',
  bank_movement_id: null, notes: null,
  created_at: '', updated_at: '', ...overrides,
})

const makeFrais = (overrides: Partial<FraisDivers> = {}): FraisDivers => ({
  id: 'f1', bien_id: 'b1', rental_unit_id: null,
  mois_concerne: '2024-01-01', date_frais: '2024-01-15',
  libelle: 'Réparation', montant_htva: 100, taux_tva: 21,
  montant_tva: 21, montant_tvac: 121,
  paye_par_agence: true, refacturable: true,
  created_at: '', updated_at: '', ...overrides,
})

const makeUnit = (overrides: Partial<RentalUnit> = {}): RentalUnit => ({
  id: 'u1', bien_id: 'b1', libelle: 'Appartement',
  loyer_mensuel: 900, charges_mensuelles: 100,
  pourcentage_honoraires: 8, taux_tva_honoraires: 21,
  base_calcul_honoraires: 'loyer_plus_charges',
  actif: true, notes: null,
  created_at: '', updated_at: '', ...overrides,
})

describe('sumPaiements', () => {
  it('additionne correctement plusieurs paiements', () => {
    const paiements = [
      makePaiement({ loyer_htva: 900, charges: 100, total_percu: 1000 }),
      makePaiement({ id: '2', loyer_htva: 800, charges: 50, total_percu: 850 }),
    ]
    const result = sumPaiements(paiements)
    expect(result.total_percu).toBe(1850)
    expect(result.loyer_htva).toBe(1700)
    expect(result.charges).toBe(150)
  })

  it('retourne zéros pour tableau vide', () => {
    const result = sumPaiements([])
    expect(result.total_percu).toBe(0)
    expect(result.loyer_htva).toBe(0)
  })
})

describe('sumFrais', () => {
  it('ne compte que les frais refacturables', () => {
    const frais = [
      makeFrais({ montant_htva: 100, montant_tva: 21, montant_tvac: 121, refacturable: true }),
      makeFrais({ id: 'f2', montant_htva: 200, montant_tva: 42, montant_tvac: 242, refacturable: false }),
    ]
    const result = sumFrais(frais)
    expect(result.htva).toBe(100)
    expect(result.tvac).toBe(121)
  })
})

describe('calcHonoraires', () => {
  it('calcule sur loyer + charges', () => {
    const unit = makeUnit({ pourcentage_honoraires: 8, taux_tva_honoraires: 21, base_calcul_honoraires: 'loyer_plus_charges' })
    const h = calcHonoraires(unit, 900, 100)
    // base = 1000, htva = 80, tva = 16.80, tvac = 96.80
    expect(h.base).toBe(1000)
    expect(h.htva).toBe(80)
    expect(h.tva).toBe(16.8)
    expect(h.tvac).toBe(96.8)
  })

  it('calcule sur loyer seul', () => {
    const unit = makeUnit({ pourcentage_honoraires: 10, taux_tva_honoraires: 21, base_calcul_honoraires: 'loyer_seul' })
    const h = calcHonoraires(unit, 1150, 0)
    // base = 1150, htva = 115, tva = 24.15, tvac = 139.15
    expect(h.base).toBe(1150)
    expect(h.htva).toBe(115)
    expect(h.tvac).toBe(139.15)
  })
})

describe('calcSolde', () => {
  it('solde = total_percu − frais − honoraires', () => {
    expect(calcSolde(1000, 121, 96.8)).toBeCloseTo(782.2, 2)
  })

  it('solde négatif possible', () => {
    expect(calcSolde(0, 200, 100)).toBe(-300)
  })
})

describe('calcDecompte', () => {
  it('calcule un décompte complet', () => {
    const paiements = [makePaiement({ loyer_htva: 900, charges: 100, total_percu: 1000 })]
    const frais = [makeFrais({ montant_htva: 100, montant_tva: 21, montant_tvac: 121, refacturable: true })]
    const units = [makeUnit({ pourcentage_honoraires: 8, base_calcul_honoraires: 'loyer_plus_charges' })]

    const res = calcDecompte(paiements, frais, units)
    expect(res.paiements.total_percu).toBe(1000)
    expect(res.frais.tvac).toBe(121)
    expect(res.honoraires.htva).toBe(80)
    // solde = 1000 - 121 - 96.80 = 782.20
    expect(res.solde_proprietaire).toBeCloseTo(782.2, 2)
  })
})
