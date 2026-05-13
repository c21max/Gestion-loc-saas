import { describe, expect, it } from 'vitest'
import {
  amountCandidates,
  currentAccountingMonthIso,
  normalizePaymentText,
  scoreTenantName,
} from '@/services/import-bancaire.service'

describe('import bancaire service helpers', () => {
  it('normalise les accents, espaces et ponctuations pour le matching', () => {
    expect(normalizePaymentText('Élodie  Dûpont / Loyer!')).toBe('elodie dupont loyer')
  })

  it('score un nom complet inclus dans le libelle', () => {
    expect(scoreTenantName('Virement loyer Jean Dupont avril', 'Jean Dupont')).toBe(60)
  })

  it('score partiellement les tokens de nom', () => {
    expect(scoreTenantName('Virement Dupont avril', 'Jean Dupont')).toBe(28)
  })

  it('extrait les montants candidats sans perdre le montant principal', () => {
    expect(amountCandidates('LOYER 1.250,00 EUR CHARGES 75,00', 1325)).toEqual([1325, 1250, 75])
  })

  it('calcule le mois comptable courant au format ISO attendu', () => {
    expect(currentAccountingMonthIso(new Date('2026-04-28T10:00:00Z'))).toBe('2026-04-01')
  })
})
