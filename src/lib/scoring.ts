// Algorithme de matching mouvement bancaire ↔ locataire
import type { BankMovement, Locataire, Bien, PaymentAlias, MonthlyExpectedRent } from '@/types/database'
import { normalizeName } from './format'

export interface ScoreResult {
  locataire_id: string
  bien_id: string
  score: number
}

/**
 * Distance de Levenshtein normalisée (retourne 0–1, 1 = identique)
 */
function levenshteinSimilarity(a: string, b: string): number {
  if (!a || !b) return 0
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])

  return 1 - dp[m][n] / Math.max(m, n)
}

export interface ScoringParams {
  movement: BankMovement
  locataires: (Locataire & { rental_units: { biens: Bien } })[]
  aliases: PaymentAlias[]
  expectedRents: MonthlyExpectedRent[]
  currentMonth: string // YYYY-MM-01
}

/**
 * Score chaque locataire actif pour un mouvement bancaire.
 * Auto-création paiement UNIQUEMENT si score ≥ 90 ET |amount - attendu| ≤ 0.50
 */
export function scoreLocataires(params: ScoringParams): ScoreResult[] {
  const { movement, locataires, aliases, expectedRents, currentMonth } = params
  const counterpartyNorm = normalizeName(movement.counterparty_name ?? '')
  const comm = (movement.communication ?? '').toLowerCase()

  const results: ScoreResult[] = []

  for (const loc of locataires) {
    const bien = loc.rental_units?.biens
    if (!bien) continue

    let score = 0

    // +60 pts : IBAN exact dans les alias
    const aliasIban = aliases.find(
      a => a.locataire_id === loc.id && a.counterparty_iban && a.counterparty_iban === movement.counterparty_iban
    )
    if (aliasIban) score += 60

    // +50 pts : nom normalisé correspond à un alias
    const aliasName = aliases.find(
      a => a.locataire_id === loc.id && a.counterparty_name_normalized === counterpartyNorm
    )
    if (aliasName) score += 50

    // +30 pts : similarité Levenshtein ≥ 0.7 entre donneur et locataire
    const locNorm = normalizeName(loc.nom_complet)
    const sim = levenshteinSimilarity(counterpartyNorm, locNorm)
    if (sim >= 0.7) score += 30

    // +20 pts : communication contient des mots-clés de l'adresse du bien
    const adresseWords = bien.adresse.toLowerCase().split(/\W+/).filter(w => w.length > 3)
    const adresseMatch = adresseWords.some(w => comm.includes(w))
    if (adresseMatch) score += 20

    // Trouver le loyer attendu pour le mois concerné
    const expected = expectedRents.find(
      e => e.locataire_id === loc.id && e.mois_concerne === currentMonth
    )
    const attendu = expected ? expected.loyer_attendu + expected.charges_attendues : null

    // +40 pts : montant dans [attendu - 0.50 ; attendu + 0.50]
    if (attendu !== null && Math.abs(movement.amount - attendu) <= 0.5) score += 40

    // +10 pts : mois courant non encore payé
    const dejaPayeMonth = expectedRents.find(
      e => e.locataire_id === loc.id && e.mois_concerne === currentMonth
    )
    if (!dejaPayeMonth) score += 10

    results.push({ locataire_id: loc.id, bien_id: bien.id, score })
  }

  // Trier par score décroissant
  return results.sort((a, b) => b.score - a.score)
}

/** Détermine si un paiement peut être auto-créé */
export function canAutoCreatePayment(
  score: number,
  amount: number,
  attendu: number | null
): boolean {
  if (attendu === null) return false
  return score >= 90 && Math.abs(amount - attendu) <= 0.5
}
