// Types générés depuis le schéma Supabase
// Régénérer avec : supabase gen types typescript --local > src/types/database.ts

export type ProprietaireType = 'personne_physique' | 'societe' | 'indivision'
export type BienStatut = 'actif' | 'inactif' | 'vendu'
export type LocataireStatut = 'actif' | 'sorti' | 'prospect'
export type BaseCalculHonoraires = 'loyer_seul' | 'loyer_plus_charges'
export type PaiementStatut = 'paye' | 'partiel' | 'impaye' | 'en_attente'
export type BankImportStatus = 'en_cours' | 'traite' | 'erreur'
export type BankParseMethod = 'text' | 'ai' | 'manual'
export type BankMovementStatus = 'a_valider' | 'apparie' | 'ignore' | 'paiement_cree' | 'doublon'
export type BankMovementCategory = 'loyer' | 'charges' | 'frais' | 'autre'
export type AgencyUserRole = 'owner' | 'admin' | 'staff'

export interface Agency {
  id: string
  name: string
  address: string | null
  postal_code: string | null
  city: string | null
  country: string
  email: string | null
  phone: string | null
  vat_number: string | null
  logo_url: string | null
  default_vat_rate: number
  default_management_fee_percentage: number
  currency: string
  created_at: string
  updated_at: string
}

export interface AgencyUser {
  id: string
  agency_id?: string
  user_id: string
  role: AgencyUserRole
  created_at: string
}

export interface AgencySettings {
  id: string
  agency_id?: string
  nom: string
  adresse: string | null
  code_postal: string | null
  ville: string | null
  pays: string
  telephone: string | null
  email: string | null
  numero_tva: string | null
  logo_url: string | null
  pourcentage_honoraires: number
  taux_tva: number
  devise: string
  updated_at: string
}

export interface Proprietaire {
  id: string
  agency_id?: string
  nom_complet: string
  type_proprietaire: ProprietaireType
  adresse: string | null
  code_postal: string | null
  ville: string | null
  pays: string | null
  email: string | null
  telephone: string | null
  numero_tva: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Bien {
  id: string
  agency_id?: string
  proprietaire_id: string
  reference_interne: string | null
  adresse: string
  type_bien: string | null
  statut: BienStatut
  notes: string | null
  created_at: string
  updated_at: string
}

export interface RentalUnit {
  id: string
  agency_id?: string
  bien_id: string
  libelle: string
  loyer_mensuel: number
  charges_mensuelles: number
  pourcentage_honoraires: number
  taux_tva_honoraires: number
  base_calcul_honoraires: BaseCalculHonoraires
  actif: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Locataire {
  id: string
  agency_id?: string
  rental_unit_id: string
  nom_complet: string
  email: string | null
  telephone: string | null
  date_debut_bail: string | null
  date_fin_bail: string | null
  statut: LocataireStatut
  loyer_mensuel_override: number | null
  charges_mensuelles_override: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface MonthlyExpectedRent {
  id: string
  agency_id?: string
  locataire_id: string
  rental_unit_id: string
  mois_concerne: string
  loyer_attendu: number
  charges_attendues: number
}

export interface Paiement {
  id: string
  agency_id?: string
  locataire_id: string
  rental_unit_id: string
  bien_id: string
  mois_concerne: string
  date_paiement: string | null
  loyer_htva: number
  charges: number
  indemnites: number
  degats_locatifs: number
  garantie_locative: number
  total_percu: number
  statut: PaiementStatut
  bank_movement_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface FraisDivers {
  id: string
  agency_id?: string
  bien_id: string
  rental_unit_id: string | null
  mois_concerne: string
  date_frais: string | null
  libelle: string
  montant_htva: number
  taux_tva: number
  montant_tva: number
  montant_tvac: number
  paye_par_agence: boolean
  refacturable: boolean
  created_at: string
  updated_at: string
}

export interface OwnerStatement {
  id: string
  agency_id?: string
  proprietaire_id: string
  bien_id: string
  mois_concerne: string
  total_percu: number
  total_frais_tvac: number
  honoraires_htva: number
  honoraires_tva: number
  honoraires_tvac: number
  solde_proprietaire: number
  pdf_storage_path: string | null
  genere_le: string | null
  created_at: string
  updated_at: string
}

export interface BankImport {
  id: string
  agency_id?: string
  file_name: string
  storage_path: string | null
  parse_method: BankParseMethod
  status: BankImportStatus
  period_start: string | null
  period_end: string | null
  total_movements: number
  matched_movements: number
  ignored_movements: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface BankMovement {
  id: string
  agency_id?: string
  import_id: string
  operation_date: string
  value_date: string | null
  direction: string
  amount: number
  currency: string
  counterparty_name: string | null
  counterparty_iban: string | null
  communication: string | null
  raw_label: string | null
  category: BankMovementCategory
  status: BankMovementStatus
  match_score: number | null
  suggested_locataire_id: string | null
  suggested_bien_id: string | null
  paiement_id: string | null
  dedupe_hash: string
  notes: string | null
  created_at: string
  updated_at: string
}

export interface PaymentAlias {
  id: string
  agency_id?: string
  locataire_id: string
  bien_id: string | null
  counterparty_name_normalized: string | null
  counterparty_iban: string | null
  source: string
  times_used: number
  last_used_at: string | null
  created_at: string
  updated_at: string
}

// Types étendus avec jointures
export interface BienAvecProprietaire extends Bien {
  proprietaires: Proprietaire
}

export interface RentalUnitAvecBien extends RentalUnit {
  biens: Bien & { proprietaires: Proprietaire }
}

export interface LocataireAvecUnit extends Locataire {
  rental_units: RentalUnit & { biens: Bien & { proprietaires: Proprietaire } }
}

export interface PaiementAvecDetails extends Paiement {
  locataires: Locataire
  rental_units: RentalUnit
  biens: Bien
}

export interface BankMovementAvecSuggestions extends BankMovement {
  locataires?: Locataire | null
  biens?: Bien | null
}

// Type pour la vue réconciliation
export interface ReconciliationRow {
  locataire: Locataire
  rental_unit: RentalUnit
  bien: Bien
  proprietaire: Proprietaire
  attendu: MonthlyExpectedRent | null
  paiements: Paiement[]
  total_percu: number
  solde: number
  statut: 'paye_confirme' | 'paiement_probable' | 'partiel' | 'impaye'
  movement_lie?: BankMovement | null
}
