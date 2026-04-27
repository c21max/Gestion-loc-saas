// Logique métier décomptes propriétaires
// Toutes les sommes sont en EUR, arrondi 2 décimales
import type { Paiement, FraisDivers, RentalUnit } from '@/types/database'

export interface SommePaiements {
  loyer_htva: number
  charges: number
  indemnites: number
  degats_locatifs: number
  garantie_locative: number
  total_percu: number
}

export interface SommeFrais {
  htva: number
  tva: number
  tvac: number
}

export interface Honoraires {
  base: number
  htva: number
  tva: number
  tvac: number
}

export interface ResultatDecompte {
  paiements: SommePaiements
  frais: SommeFrais
  honoraires: Honoraires
  solde_proprietaire: number
}

/** Additionne tous les paiements d'un bien pour un mois */
export function sumPaiements(paiements: Paiement[]): SommePaiements {
  return paiements.reduce(
    (acc, p) => ({
      loyer_htva: acc.loyer_htva + p.loyer_htva,
      charges: acc.charges + p.charges,
      indemnites: acc.indemnites + p.indemnites,
      degats_locatifs: acc.degats_locatifs + p.degats_locatifs,
      garantie_locative: acc.garantie_locative + p.garantie_locative,
      total_percu: acc.total_percu + p.total_percu,
    }),
    { loyer_htva: 0, charges: 0, indemnites: 0, degats_locatifs: 0, garantie_locative: 0, total_percu: 0 }
  )
}

/** Additionne les frais refacturables du mois */
export function sumFrais(frais: FraisDivers[]): SommeFrais {
  const refact = frais.filter(f => f.refacturable)
  return refact.reduce(
    (acc, f) => ({
      htva: acc.htva + f.montant_htva,
      tva: acc.tva + f.montant_tva,
      tvac: acc.tvac + f.montant_tvac,
    }),
    { htva: 0, tva: 0, tvac: 0 }
  )
}

/** Calcule les honoraires sur la base configurée par l'unité */
export function calcHonoraires(unit: RentalUnit, loyer_percu: number, charges_percues: number): Honoraires {
  const base =
    unit.base_calcul_honoraires === 'loyer_seul'
      ? loyer_percu
      : loyer_percu + charges_percues

  const htva = round2(base * (unit.pourcentage_honoraires / 100))
  const tva = round2(htva * (unit.taux_tva_honoraires / 100))
  const tvac = round2(htva + tva)

  return { base, htva, tva, tvac }
}

/**
 * Calcule le solde propriétaire pour un bien sur un mois
 * Solde = total_percu − frais_tvac − honoraires_tvac
 */
export function calcSolde(total_percu: number, frais_tvac: number, honoraires_tvac: number): number {
  return round2(total_percu - frais_tvac - honoraires_tvac)
}

/**
 * Point d'entrée principal : calcule le décompte complet
 * Prend en charge les unités multiples d'un même bien
 */
export function calcDecompte(
  paiements: Paiement[],
  frais: FraisDivers[],
  units: RentalUnit[]
): ResultatDecompte {
  const sommePaie = sumPaiements(paiements)
  const sommeFrais = sumFrais(frais)

  // Aggrège les honoraires par unité selon leur propre configuration
  const honorairesTotal = units.reduce(
    (acc, unit) => {
      // Paiements de cette unité uniquement
      const pUnit = paiements.filter(p => p.rental_unit_id === unit.id)
      const sUnit = sumPaiements(pUnit)
      const h = calcHonoraires(unit, sUnit.loyer_htva, sUnit.charges)
      return {
        base: acc.base + h.base,
        htva: acc.htva + h.htva,
        tva: acc.tva + h.tva,
        tvac: acc.tvac + h.tvac,
      }
    },
    { base: 0, htva: 0, tva: 0, tvac: 0 }
  )

  const solde = calcSolde(sommePaie.total_percu, sommeFrais.tvac, honorairesTotal.tvac)

  return {
    paiements: sommePaie,
    frais: sommeFrais,
    honoraires: honorairesTotal,
    solde_proprietaire: solde,
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100
