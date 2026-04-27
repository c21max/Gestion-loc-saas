import type {
  Proprietaire, Bien, RentalUnit, Locataire, Paiement, FraisDivers,
  BankImport, BankMovement, OwnerStatement, MonthlyExpectedRent, AgencySettings,
} from '@/types/database'

export const DEMO_MOIS_ISO = '2026-04-01'
export const DEMO_MOIS_STR = '2026-04'
export const DEMO_PREV_MOIS_ISO = '2026-03-01'

// ─── Propriétaires ───────────────────────────────────────────────────────────

export const DEMO_PROPRIETAIRES: (Proprietaire & { biens: { id: string }[] })[] = [
  { id: 'dp-01', nom_complet: 'Vanderborght & Gilon', type_proprietaire: 'indivision', email: 'a.vanderborght@gmail.com', telephone: '+32 81 45 67 89', adresse: 'Rue des Templiers 12', code_postal: '5030', ville: 'Gembloux', pays: 'BE', numero_tva: null, notes: null, created_at: '2024-01-10T10:00:00Z', updated_at: '2024-01-10T10:00:00Z', biens: [{ id: 'db-01' }, { id: 'db-14' }] },
  { id: 'dp-02', nom_complet: 'Madame Francesca TRISCIUOGLIO', type_proprietaire: 'personne_physique', email: 'f.trisciuoglio@outlook.com', telephone: '+32 497 12 34 56', adresse: 'Avenue de la Paix 7', code_postal: '5030', ville: 'Gembloux', pays: 'BE', numero_tva: null, notes: null, created_at: '2024-01-11T10:00:00Z', updated_at: '2024-01-11T10:00:00Z', biens: [{ id: 'db-02' }] },
  { id: 'dp-03', nom_complet: 'Madame Valentina TRISCIUOGLIO', type_proprietaire: 'personne_physique', email: 'v.trisciuoglio@gmail.com', telephone: null, adresse: 'Via Roma 15', code_postal: null, ville: 'Milan', pays: 'IT', numero_tva: null, notes: null, created_at: '2024-01-12T10:00:00Z', updated_at: '2024-01-12T10:00:00Z', biens: [{ id: 'db-03' }] },
  { id: 'dp-04', nom_complet: 'Monsieur Aldo TRISCIUOGLIO', type_proprietaire: 'personne_physique', email: null, telephone: '+32 485 98 76 54', adresse: 'Rue du Moulin 3', code_postal: '5030', ville: 'Gembloux', pays: 'BE', numero_tva: null, notes: null, created_at: '2024-01-13T10:00:00Z', updated_at: '2024-01-13T10:00:00Z', biens: [{ id: 'db-04' }] },
  { id: 'dp-05', nom_complet: 'Madame PAQUAY Marie-Louise', type_proprietaire: 'personne_physique', email: 'ml.paquay@proximus.be', telephone: '+32 81 33 44 55', adresse: 'Chaussée de Namur 102', code_postal: '5030', ville: 'Gembloux', pays: 'BE', numero_tva: null, notes: null, created_at: '2024-02-01T10:00:00Z', updated_at: '2024-02-01T10:00:00Z', biens: [{ id: 'db-05' }] },
  { id: 'dp-06', nom_complet: 'Madame Véronique EECKHOUDT', type_proprietaire: 'personne_physique', email: 'v.eeckhoudt@gmail.com', telephone: '+32 496 22 11 33', adresse: 'Rue de la Faculté 8', code_postal: '1348', ville: 'Louvain-la-Neuve', pays: 'BE', numero_tva: null, notes: null, created_at: '2024-02-05T10:00:00Z', updated_at: '2024-02-05T10:00:00Z', biens: [{ id: 'db-06' }] },
  { id: 'dp-07', nom_complet: 'Monsieur Christophe BELLON', type_proprietaire: 'personne_physique', email: 'c.bellon@yahoo.fr', telephone: null, adresse: 'Impasse des Roses 4', code_postal: '5030', ville: 'Gembloux', pays: 'BE', numero_tva: null, notes: null, created_at: '2024-02-10T10:00:00Z', updated_at: '2024-02-10T10:00:00Z', biens: [{ id: 'db-07' }] },
  { id: 'dp-08', nom_complet: 'SRL Belgique Sous-Traitance', type_proprietaire: 'societe', email: 'info@bst.be', telephone: '+32 81 55 66 77', adresse: 'Zone Industrielle 22', code_postal: '5030', ville: 'Gembloux', pays: 'BE', numero_tva: 'BE0456.789.012', notes: null, created_at: '2024-03-01T10:00:00Z', updated_at: '2024-03-01T10:00:00Z', biens: [{ id: 'db-08' }] },
  { id: 'dp-09', nom_complet: '(Proprio Jemeppe)', type_proprietaire: 'personne_physique', email: null, telephone: '+32 71 44 55 66', adresse: null, code_postal: null, ville: 'Jemeppe-sur-Sambre', pays: 'BE', numero_tva: null, notes: null, created_at: '2024-03-10T10:00:00Z', updated_at: '2024-03-10T10:00:00Z', biens: [{ id: 'db-09' }, { id: 'db-10' }] },
  { id: 'dp-10', nom_complet: 'RENSON Philippe', type_proprietaire: 'personne_physique', email: 'ph.renson@skynet.be', telephone: '+32 81 77 88 99', adresse: 'Rue des Cerisiers 24', code_postal: '5030', ville: 'Gembloux', pays: 'BE', numero_tva: null, notes: null, created_at: '2024-03-15T10:00:00Z', updated_at: '2024-03-15T10:00:00Z', biens: [{ id: 'db-11' }, { id: 'db-12' }, { id: 'db-13' }] },
]

// ─── Biens ───────────────────────────────────────────────────────────────────

export const DEMO_BIENS: Bien[] = [
  { id: 'db-01', proprietaire_id: 'dp-01', reference_interne: 'GBX-001', adresse: 'Rue de Gembloux 14, 5030 Gembloux', type_bien: 'Immeuble', statut: 'actif', notes: null, created_at: '2024-01-10T10:00:00Z', updated_at: '2024-01-10T10:00:00Z' },
  { id: 'db-02', proprietaire_id: 'dp-02', reference_interne: 'LLN-001', adresse: 'Rue du Tilleul 22, 1348 Louvain-la-Neuve', type_bien: 'Appartement', statut: 'actif', notes: null, created_at: '2024-01-11T10:00:00Z', updated_at: '2024-01-11T10:00:00Z' },
  { id: 'db-03', proprietaire_id: 'dp-03', reference_interne: 'LLN-002', adresse: "Avenue de l'Université 8, 1348 LLN", type_bien: 'Studio', statut: 'actif', notes: null, created_at: '2024-01-12T10:00:00Z', updated_at: '2024-01-12T10:00:00Z' },
  { id: 'db-04', proprietaire_id: 'dp-04', reference_interne: 'GBX-002', adresse: 'Chaussée de Namur 45, 5030 Gembloux', type_bien: 'Appartement', statut: 'actif', notes: null, created_at: '2024-01-13T10:00:00Z', updated_at: '2024-01-13T10:00:00Z' },
  { id: 'db-05', proprietaire_id: 'dp-05', reference_interne: 'GBX-003', adresse: 'Rue des Chapeliers 3, 5030 Gembloux', type_bien: 'Maison', statut: 'actif', notes: null, created_at: '2024-02-01T10:00:00Z', updated_at: '2024-02-01T10:00:00Z' },
  { id: 'db-06', proprietaire_id: 'dp-06', reference_interne: 'GBX-004', adresse: 'Rue de la Station 17, 5030 Gembloux', type_bien: 'Appartement', statut: 'actif', notes: null, created_at: '2024-02-05T10:00:00Z', updated_at: '2024-02-05T10:00:00Z' },
  { id: 'db-07', proprietaire_id: 'dp-07', reference_interne: 'GBX-005', adresse: 'Impasse des Coquelicots 2, 5030 Gembloux', type_bien: 'Maison', statut: 'actif', notes: null, created_at: '2024-02-10T10:00:00Z', updated_at: '2024-02-10T10:00:00Z' },
  { id: 'db-08', proprietaire_id: 'dp-08', reference_interne: 'GBX-006', adresse: 'Rue du Commerce 56, 5030 Gembloux', type_bien: 'Bureau', statut: 'actif', notes: null, created_at: '2024-03-01T10:00:00Z', updated_at: '2024-03-01T10:00:00Z' },
  { id: 'db-09', proprietaire_id: 'dp-09', reference_interne: 'JMP-001', adresse: 'Rue Victor Hugo 12, 5190 Jemeppe', type_bien: 'Immeuble', statut: 'actif', notes: null, created_at: '2024-03-10T10:00:00Z', updated_at: '2024-03-10T10:00:00Z' },
  { id: 'db-10', proprietaire_id: 'dp-09', reference_interne: 'JMP-002', adresse: 'Rue de la Paix 8, 5190 Jemeppe', type_bien: 'Maison', statut: 'actif', notes: null, created_at: '2024-03-10T10:00:00Z', updated_at: '2024-03-10T10:00:00Z' },
  { id: 'db-11', proprietaire_id: 'dp-10', reference_interne: 'GBX-007', adresse: 'Rue des Cerisiers 24, 5030 Gembloux', type_bien: 'Appartement', statut: 'actif', notes: null, created_at: '2024-03-15T10:00:00Z', updated_at: '2024-03-15T10:00:00Z' },
  { id: 'db-12', proprietaire_id: 'dp-10', reference_interne: 'GBX-008', adresse: 'Avenue du Roi 33, 5030 Gembloux', type_bien: 'Appartement', statut: 'actif', notes: null, created_at: '2024-03-15T10:00:00Z', updated_at: '2024-03-15T10:00:00Z' },
  { id: 'db-13', proprietaire_id: 'dp-10', reference_interne: 'LLN-003', adresse: 'Rue du Moulin 7, 1348 LLN', type_bien: 'Studio', statut: 'actif', notes: null, created_at: '2024-03-15T10:00:00Z', updated_at: '2024-03-15T10:00:00Z' },
  { id: 'db-14', proprietaire_id: 'dp-01', reference_interne: 'GBX-009', adresse: 'Rue de Fleurus 19, 5030 Gembloux', type_bien: 'Appartement', statut: 'actif', notes: null, created_at: '2024-04-01T10:00:00Z', updated_at: '2024-04-01T10:00:00Z' },
]

// ─── Unités locatives ─────────────────────────────────────────────────────────

export const DEMO_RENTAL_UNITS: RentalUnit[] = [
  { id: 'du-01', bien_id: 'db-01', libelle: 'Appartement 1er étage', loyer_mensuel: 750, charges_mensuelles: 100, pourcentage_honoraires: 7, taux_tva_honoraires: 21, base_calcul_honoraires: 'loyer_seul', actif: true, notes: null, created_at: '2024-01-10T10:00:00Z', updated_at: '2024-01-10T10:00:00Z' },
  { id: 'du-02', bien_id: 'db-01', libelle: 'Appartement 2ème étage', loyer_mensuel: 680, charges_mensuelles: 80, pourcentage_honoraires: 7, taux_tva_honoraires: 21, base_calcul_honoraires: 'loyer_seul', actif: true, notes: null, created_at: '2024-01-10T10:00:00Z', updated_at: '2024-01-10T10:00:00Z' },
  { id: 'du-03', bien_id: 'db-02', libelle: 'Appartement', loyer_mensuel: 820, charges_mensuelles: 90, pourcentage_honoraires: 8, taux_tva_honoraires: 21, base_calcul_honoraires: 'loyer_seul', actif: true, notes: null, created_at: '2024-01-11T10:00:00Z', updated_at: '2024-01-11T10:00:00Z' },
  { id: 'du-04', bien_id: 'db-03', libelle: 'Studio', loyer_mensuel: 550, charges_mensuelles: 0, pourcentage_honoraires: 8, taux_tva_honoraires: 21, base_calcul_honoraires: 'loyer_seul', actif: true, notes: null, created_at: '2024-01-12T10:00:00Z', updated_at: '2024-01-12T10:00:00Z' },
  { id: 'du-05', bien_id: 'db-04', libelle: 'Appartement 2 ch.', loyer_mensuel: 700, charges_mensuelles: 90, pourcentage_honoraires: 7, taux_tva_honoraires: 21, base_calcul_honoraires: 'loyer_plus_charges', actif: true, notes: null, created_at: '2024-01-13T10:00:00Z', updated_at: '2024-01-13T10:00:00Z' },
  { id: 'du-06', bien_id: 'db-05', libelle: 'Maison complète', loyer_mensuel: 950, charges_mensuelles: 120, pourcentage_honoraires: 7, taux_tva_honoraires: 21, base_calcul_honoraires: 'loyer_seul', actif: true, notes: null, created_at: '2024-02-01T10:00:00Z', updated_at: '2024-02-01T10:00:00Z' },
  { id: 'du-07', bien_id: 'db-06', libelle: 'Appartement 3 ch.', loyer_mensuel: 880, charges_mensuelles: 110, pourcentage_honoraires: 8, taux_tva_honoraires: 21, base_calcul_honoraires: 'loyer_seul', actif: true, notes: null, created_at: '2024-02-05T10:00:00Z', updated_at: '2024-02-05T10:00:00Z' },
  { id: 'du-08', bien_id: 'db-07', libelle: '4 façades', loyer_mensuel: 1050, charges_mensuelles: 150, pourcentage_honoraires: 7, taux_tva_honoraires: 21, base_calcul_honoraires: 'loyer_seul', actif: true, notes: null, created_at: '2024-02-10T10:00:00Z', updated_at: '2024-02-10T10:00:00Z' },
  { id: 'du-09', bien_id: 'db-08', libelle: 'Bureau / Commerce', loyer_mensuel: 1150, charges_mensuelles: 180, pourcentage_honoraires: 10, taux_tva_honoraires: 21, base_calcul_honoraires: 'loyer_plus_charges', actif: true, notes: null, created_at: '2024-03-01T10:00:00Z', updated_at: '2024-03-01T10:00:00Z' },
  { id: 'du-10', bien_id: 'db-09', libelle: 'Appartement A', loyer_mensuel: 620, charges_mensuelles: 60, pourcentage_honoraires: 7, taux_tva_honoraires: 21, base_calcul_honoraires: 'loyer_seul', actif: true, notes: null, created_at: '2024-03-10T10:00:00Z', updated_at: '2024-03-10T10:00:00Z' },
  { id: 'du-11', bien_id: 'db-09', libelle: 'Appartement B', loyer_mensuel: 600, charges_mensuelles: 60, pourcentage_honoraires: 7, taux_tva_honoraires: 21, base_calcul_honoraires: 'loyer_seul', actif: true, notes: null, created_at: '2024-03-10T10:00:00Z', updated_at: '2024-03-10T10:00:00Z' },
  { id: 'du-12', bien_id: 'db-10', libelle: 'Maison', loyer_mensuel: 780, charges_mensuelles: 80, pourcentage_honoraires: 7, taux_tva_honoraires: 21, base_calcul_honoraires: 'loyer_seul', actif: true, notes: null, created_at: '2024-03-10T10:00:00Z', updated_at: '2024-03-10T10:00:00Z' },
  { id: 'du-13', bien_id: 'db-11', libelle: 'Appartement', loyer_mensuel: 720, charges_mensuelles: 70, pourcentage_honoraires: 7, taux_tva_honoraires: 21, base_calcul_honoraires: 'loyer_seul', actif: true, notes: null, created_at: '2024-03-15T10:00:00Z', updated_at: '2024-03-15T10:00:00Z' },
  { id: 'du-14', bien_id: 'db-12', libelle: 'Appartement', loyer_mensuel: 690, charges_mensuelles: 75, pourcentage_honoraires: 7, taux_tva_honoraires: 21, base_calcul_honoraires: 'loyer_seul', actif: true, notes: null, created_at: '2024-03-15T10:00:00Z', updated_at: '2024-03-15T10:00:00Z' },
  { id: 'du-15', bien_id: 'db-13', libelle: 'Studio', loyer_mensuel: 500, charges_mensuelles: 0, pourcentage_honoraires: 8, taux_tva_honoraires: 21, base_calcul_honoraires: 'loyer_seul', actif: true, notes: null, created_at: '2024-03-15T10:00:00Z', updated_at: '2024-03-15T10:00:00Z' },
]

// ─── Locataires ───────────────────────────────────────────────────────────────

export const DEMO_LOCATAIRES: Locataire[] = [
  { id: 'dl-01', rental_unit_id: 'du-01', nom_complet: 'Moreno - Coconi', email: 'moreno.coconi@gmail.com', telephone: '+32 471 11 22 33', date_debut_bail: '2022-09-01', date_fin_bail: null, statut: 'actif', loyer_mensuel_override: null, charges_mensuelles_override: null, notes: null, created_at: '2022-09-01T10:00:00Z', updated_at: '2022-09-01T10:00:00Z' },
  { id: 'dl-02', rental_unit_id: 'du-02', nom_complet: 'Camille MESSAGER', email: 'c.messager@student.uclouvain.be', telephone: '+32 484 44 55 66', date_debut_bail: '2023-09-01', date_fin_bail: '2025-08-31', statut: 'actif', loyer_mensuel_override: null, charges_mensuelles_override: null, notes: null, created_at: '2023-09-01T10:00:00Z', updated_at: '2023-09-01T10:00:00Z' },
  { id: 'dl-03', rental_unit_id: 'du-03', nom_complet: 'Jean-Pierre DUBOIS', email: 'jp.dubois@gmail.com', telephone: '+32 10 45 67 89', date_debut_bail: '2021-07-01', date_fin_bail: null, statut: 'actif', loyer_mensuel_override: null, charges_mensuelles_override: null, notes: null, created_at: '2021-07-01T10:00:00Z', updated_at: '2021-07-01T10:00:00Z' },
  { id: 'dl-04', rental_unit_id: 'du-04', nom_complet: 'Sophie MARTIN', email: 's.martin@hotmail.com', telephone: null, date_debut_bail: '2024-09-01', date_fin_bail: '2025-08-31', statut: 'actif', loyer_mensuel_override: null, charges_mensuelles_override: null, notes: null, created_at: '2024-09-01T10:00:00Z', updated_at: '2024-09-01T10:00:00Z' },
  { id: 'dl-05', rental_unit_id: 'du-05', nom_complet: 'Ahmed BENALI', email: 'a.benali@gmail.com', telephone: '+32 495 33 44 55', date_debut_bail: '2023-03-01', date_fin_bail: null, statut: 'actif', loyer_mensuel_override: null, charges_mensuelles_override: null, notes: null, created_at: '2023-03-01T10:00:00Z', updated_at: '2023-03-01T10:00:00Z' },
  { id: 'dl-06', rental_unit_id: 'du-06', nom_complet: 'Marie DUPONT', email: 'm.dupont@yahoo.be', telephone: '+32 81 22 33 44', date_debut_bail: '2020-06-01', date_fin_bail: null, statut: 'actif', loyer_mensuel_override: null, charges_mensuelles_override: null, notes: null, created_at: '2020-06-01T10:00:00Z', updated_at: '2020-06-01T10:00:00Z' },
  { id: 'dl-07', rental_unit_id: 'du-07', nom_complet: 'Thomas LEFEVRE', email: 't.lefevre@proximus.be', telephone: '+32 496 88 77 66', date_debut_bail: '2022-01-01', date_fin_bail: null, statut: 'actif', loyer_mensuel_override: null, charges_mensuelles_override: null, notes: null, created_at: '2022-01-01T10:00:00Z', updated_at: '2022-01-01T10:00:00Z' },
  { id: 'dl-08', rental_unit_id: 'du-08', nom_complet: 'Isabelle RENARD', email: 'i.renard@uclouvain.be', telephone: null, date_debut_bail: '2019-10-01', date_fin_bail: null, statut: 'actif', loyer_mensuel_override: null, charges_mensuelles_override: null, notes: null, created_at: '2019-10-01T10:00:00Z', updated_at: '2019-10-01T10:00:00Z' },
  { id: 'dl-09', rental_unit_id: 'du-09', nom_complet: 'SARL Commerce Local', email: 'info@commercelocal.be', telephone: '+32 81 99 88 77', date_debut_bail: '2023-01-01', date_fin_bail: '2026-12-31', statut: 'actif', loyer_mensuel_override: null, charges_mensuelles_override: null, notes: null, created_at: '2023-01-01T10:00:00Z', updated_at: '2023-01-01T10:00:00Z' },
  { id: 'dl-10', rental_unit_id: 'du-10', nom_complet: 'Pierre LAMBERT', email: 'p.lambert@gmail.com', telephone: '+32 71 12 34 56', date_debut_bail: '2023-06-01', date_fin_bail: null, statut: 'actif', loyer_mensuel_override: null, charges_mensuelles_override: null, notes: null, created_at: '2023-06-01T10:00:00Z', updated_at: '2023-06-01T10:00:00Z' },
  { id: 'dl-11', rental_unit_id: 'du-11', nom_complet: 'Nathalie SIMON', email: 'n.simon@hotmail.com', telephone: '+32 499 55 44 33', date_debut_bail: '2024-02-01', date_fin_bail: null, statut: 'actif', loyer_mensuel_override: null, charges_mensuelles_override: null, notes: null, created_at: '2024-02-01T10:00:00Z', updated_at: '2024-02-01T10:00:00Z' },
  { id: 'dl-12', rental_unit_id: 'du-12', nom_complet: 'Francis GODART', email: null, telephone: '+32 71 66 77 88', date_debut_bail: '2021-04-01', date_fin_bail: null, statut: 'actif', loyer_mensuel_override: null, charges_mensuelles_override: null, notes: null, created_at: '2021-04-01T10:00:00Z', updated_at: '2021-04-01T10:00:00Z' },
  { id: 'dl-13', rental_unit_id: 'du-13', nom_complet: 'Emilie DUCHENE', email: 'e.duchene@gmail.com', telephone: '+32 475 11 22 33', date_debut_bail: '2022-10-01', date_fin_bail: null, statut: 'actif', loyer_mensuel_override: null, charges_mensuelles_override: null, notes: null, created_at: '2022-10-01T10:00:00Z', updated_at: '2022-10-01T10:00:00Z' },
  { id: 'dl-14', rental_unit_id: 'du-14', nom_complet: 'Laurent REMY', email: 'l.remy@yahoo.fr', telephone: null, date_debut_bail: '2023-09-01', date_fin_bail: null, statut: 'actif', loyer_mensuel_override: 670, charges_mensuelles_override: null, notes: 'Loyer négocié', created_at: '2023-09-01T10:00:00Z', updated_at: '2023-09-01T10:00:00Z' },
  { id: 'dl-15', rental_unit_id: 'du-15', nom_complet: 'Anaïs COLLIGNON', email: 'anais.collignon@student.uclouvain.be', telephone: '+32 485 77 66 55', date_debut_bail: '2025-09-01', date_fin_bail: '2026-08-31', statut: 'actif', loyer_mensuel_override: null, charges_mensuelles_override: null, notes: null, created_at: '2025-09-01T10:00:00Z', updated_at: '2025-09-01T10:00:00Z' },
]

// ─── Paiements (mois courant) ─────────────────────────────────────────────────

export const DEMO_PAIEMENTS: (Paiement & {
  locataires: { nom_complet: string }
  biens: { adresse: string }
  rental_units: { libelle: string }
})[] = [
  { id: 'dpay-01', locataire_id: 'dl-01', rental_unit_id: 'du-01', bien_id: 'db-01', mois_concerne: DEMO_MOIS_ISO, date_paiement: '2026-04-02', loyer_htva: 750, charges: 100, indemnites: 0, degats_locatifs: 0, garantie_locative: 0, total_percu: 850, statut: 'paye', bank_movement_id: 'dbm-01', notes: null, created_at: '2026-04-02T09:00:00Z', updated_at: '2026-04-02T09:00:00Z', locataires: { nom_complet: 'Moreno - Coconi' }, biens: { adresse: 'Rue de Gembloux 14, 5030 Gembloux' }, rental_units: { libelle: 'Appartement 1er étage' } },
  { id: 'dpay-02', locataire_id: 'dl-02', rental_unit_id: 'du-02', bien_id: 'db-01', mois_concerne: DEMO_MOIS_ISO, date_paiement: '2026-04-03', loyer_htva: 680, charges: 80, indemnites: 0, degats_locatifs: 0, garantie_locative: 0, total_percu: 760, statut: 'paye', bank_movement_id: 'dbm-02', notes: null, created_at: '2026-04-03T09:00:00Z', updated_at: '2026-04-03T09:00:00Z', locataires: { nom_complet: 'Camille MESSAGER' }, biens: { adresse: 'Rue de Gembloux 14, 5030 Gembloux' }, rental_units: { libelle: 'Appartement 2ème étage' } },
  { id: 'dpay-03', locataire_id: 'dl-03', rental_unit_id: 'du-03', bien_id: 'db-02', mois_concerne: DEMO_MOIS_ISO, date_paiement: '2026-04-05', loyer_htva: 820, charges: 90, indemnites: 0, degats_locatifs: 0, garantie_locative: 0, total_percu: 910, statut: 'paye', bank_movement_id: null, notes: null, created_at: '2026-04-05T09:00:00Z', updated_at: '2026-04-05T09:00:00Z', locataires: { nom_complet: 'Jean-Pierre DUBOIS' }, biens: { adresse: 'Rue du Tilleul 22, 1348 Louvain-la-Neuve' }, rental_units: { libelle: 'Appartement' } },
  { id: 'dpay-04', locataire_id: 'dl-04', rental_unit_id: 'du-04', bien_id: 'db-03', mois_concerne: DEMO_MOIS_ISO, date_paiement: '2026-04-01', loyer_htva: 550, charges: 0, indemnites: 0, degats_locatifs: 0, garantie_locative: 0, total_percu: 550, statut: 'paye', bank_movement_id: null, notes: null, created_at: '2026-04-01T09:00:00Z', updated_at: '2026-04-01T09:00:00Z', locataires: { nom_complet: 'Sophie MARTIN' }, biens: { adresse: "Avenue de l'Université 8, 1348 LLN" }, rental_units: { libelle: 'Studio' } },
  { id: 'dpay-06', locataire_id: 'dl-06', rental_unit_id: 'du-06', bien_id: 'db-05', mois_concerne: DEMO_MOIS_ISO, date_paiement: '2026-04-04', loyer_htva: 950, charges: 120, indemnites: 0, degats_locatifs: 0, garantie_locative: 0, total_percu: 1070, statut: 'paye', bank_movement_id: null, notes: null, created_at: '2026-04-04T09:00:00Z', updated_at: '2026-04-04T09:00:00Z', locataires: { nom_complet: 'Marie DUPONT' }, biens: { adresse: 'Rue des Chapeliers 3, 5030 Gembloux' }, rental_units: { libelle: 'Maison complète' } },
  { id: 'dpay-07', locataire_id: 'dl-07', rental_unit_id: 'du-07', bien_id: 'db-06', mois_concerne: DEMO_MOIS_ISO, date_paiement: '2026-04-10', loyer_htva: 880, charges: 110, indemnites: 0, degats_locatifs: 0, garantie_locative: 0, total_percu: 500, statut: 'partiel', bank_movement_id: null, notes: 'Paiement partiel reçu', created_at: '2026-04-10T09:00:00Z', updated_at: '2026-04-10T09:00:00Z', locataires: { nom_complet: 'Thomas LEFEVRE' }, biens: { adresse: 'Rue de la Station 17, 5030 Gembloux' }, rental_units: { libelle: 'Appartement 3 ch.' } },
  { id: 'dpay-08', locataire_id: 'dl-08', rental_unit_id: 'du-08', bien_id: 'db-07', mois_concerne: DEMO_MOIS_ISO, date_paiement: '2026-04-02', loyer_htva: 1050, charges: 150, indemnites: 0, degats_locatifs: 0, garantie_locative: 0, total_percu: 1200, statut: 'paye', bank_movement_id: null, notes: null, created_at: '2026-04-02T09:00:00Z', updated_at: '2026-04-02T09:00:00Z', locataires: { nom_complet: 'Isabelle RENARD' }, biens: { adresse: 'Impasse des Coquelicots 2, 5030 Gembloux' }, rental_units: { libelle: '4 façades' } },
  { id: 'dpay-10', locataire_id: 'dl-10', rental_unit_id: 'du-10', bien_id: 'db-09', mois_concerne: DEMO_MOIS_ISO, date_paiement: '2026-04-06', loyer_htva: 620, charges: 60, indemnites: 0, degats_locatifs: 0, garantie_locative: 0, total_percu: 680, statut: 'paye', bank_movement_id: null, notes: null, created_at: '2026-04-06T09:00:00Z', updated_at: '2026-04-06T09:00:00Z', locataires: { nom_complet: 'Pierre LAMBERT' }, biens: { adresse: 'Rue Victor Hugo 12, 5190 Jemeppe' }, rental_units: { libelle: 'Appartement A' } },
  { id: 'dpay-12', locataire_id: 'dl-12', rental_unit_id: 'du-12', bien_id: 'db-10', mois_concerne: DEMO_MOIS_ISO, date_paiement: '2026-04-03', loyer_htva: 780, charges: 80, indemnites: 0, degats_locatifs: 0, garantie_locative: 0, total_percu: 860, statut: 'paye', bank_movement_id: null, notes: null, created_at: '2026-04-03T09:00:00Z', updated_at: '2026-04-03T09:00:00Z', locataires: { nom_complet: 'Francis GODART' }, biens: { adresse: 'Rue de la Paix 8, 5190 Jemeppe' }, rental_units: { libelle: 'Maison' } },
  { id: 'dpay-13', locataire_id: 'dl-13', rental_unit_id: 'du-13', bien_id: 'db-11', mois_concerne: DEMO_MOIS_ISO, date_paiement: '2026-04-07', loyer_htva: 720, charges: 70, indemnites: 0, degats_locatifs: 0, garantie_locative: 0, total_percu: 790, statut: 'paye', bank_movement_id: null, notes: null, created_at: '2026-04-07T09:00:00Z', updated_at: '2026-04-07T09:00:00Z', locataires: { nom_complet: 'Emilie DUCHENE' }, biens: { adresse: 'Rue des Cerisiers 24, 5030 Gembloux' }, rental_units: { libelle: 'Appartement' } },
  { id: 'dpay-15', locataire_id: 'dl-15', rental_unit_id: 'du-15', bien_id: 'db-13', mois_concerne: DEMO_MOIS_ISO, date_paiement: '2026-04-01', loyer_htva: 500, charges: 0, indemnites: 0, degats_locatifs: 0, garantie_locative: 0, total_percu: 500, statut: 'paye', bank_movement_id: null, notes: null, created_at: '2026-04-01T09:00:00Z', updated_at: '2026-04-01T09:00:00Z', locataires: { nom_complet: 'Anaïs COLLIGNON' }, biens: { adresse: 'Rue du Moulin 7, 1348 LLN' }, rental_units: { libelle: 'Studio' } },
]

// ─── Monthly Expected Rents (mois courant) ────────────────────────────────────

export const DEMO_EXPECTED_RENTS: MonthlyExpectedRent[] = [
  { id: 'dmer-01', locataire_id: 'dl-01', rental_unit_id: 'du-01', mois_concerne: DEMO_MOIS_ISO, loyer_attendu: 750, charges_attendues: 100 },
  { id: 'dmer-02', locataire_id: 'dl-02', rental_unit_id: 'du-02', mois_concerne: DEMO_MOIS_ISO, loyer_attendu: 680, charges_attendues: 80 },
  { id: 'dmer-03', locataire_id: 'dl-03', rental_unit_id: 'du-03', mois_concerne: DEMO_MOIS_ISO, loyer_attendu: 820, charges_attendues: 90 },
  { id: 'dmer-04', locataire_id: 'dl-04', rental_unit_id: 'du-04', mois_concerne: DEMO_MOIS_ISO, loyer_attendu: 550, charges_attendues: 0 },
  { id: 'dmer-05', locataire_id: 'dl-05', rental_unit_id: 'du-05', mois_concerne: DEMO_MOIS_ISO, loyer_attendu: 700, charges_attendues: 90 },
  { id: 'dmer-06', locataire_id: 'dl-06', rental_unit_id: 'du-06', mois_concerne: DEMO_MOIS_ISO, loyer_attendu: 950, charges_attendues: 120 },
  { id: 'dmer-07', locataire_id: 'dl-07', rental_unit_id: 'du-07', mois_concerne: DEMO_MOIS_ISO, loyer_attendu: 880, charges_attendues: 110 },
  { id: 'dmer-08', locataire_id: 'dl-08', rental_unit_id: 'du-08', mois_concerne: DEMO_MOIS_ISO, loyer_attendu: 1050, charges_attendues: 150 },
  { id: 'dmer-09', locataire_id: 'dl-09', rental_unit_id: 'du-09', mois_concerne: DEMO_MOIS_ISO, loyer_attendu: 1150, charges_attendues: 180 },
  { id: 'dmer-10', locataire_id: 'dl-10', rental_unit_id: 'du-10', mois_concerne: DEMO_MOIS_ISO, loyer_attendu: 620, charges_attendues: 60 },
  { id: 'dmer-11', locataire_id: 'dl-11', rental_unit_id: 'du-11', mois_concerne: DEMO_MOIS_ISO, loyer_attendu: 600, charges_attendues: 60 },
  { id: 'dmer-12', locataire_id: 'dl-12', rental_unit_id: 'du-12', mois_concerne: DEMO_MOIS_ISO, loyer_attendu: 780, charges_attendues: 80 },
  { id: 'dmer-13', locataire_id: 'dl-13', rental_unit_id: 'du-13', mois_concerne: DEMO_MOIS_ISO, loyer_attendu: 720, charges_attendues: 70 },
  { id: 'dmer-14', locataire_id: 'dl-14', rental_unit_id: 'du-14', mois_concerne: DEMO_MOIS_ISO, loyer_attendu: 670, charges_attendues: 75 },
  { id: 'dmer-15', locataire_id: 'dl-15', rental_unit_id: 'du-15', mois_concerne: DEMO_MOIS_ISO, loyer_attendu: 500, charges_attendues: 0 },
]

// ─── Frais divers ─────────────────────────────────────────────────────────────

export const DEMO_FRAIS: (FraisDivers & {
  biens: { adresse: string }
  rental_units: { libelle: string } | null
})[] = [
  { id: 'df-01', bien_id: 'db-01', rental_unit_id: null, mois_concerne: DEMO_MOIS_ISO, date_frais: '2026-04-05', libelle: 'Réparation plomberie (douche 1er)', montant_htva: 250, taux_tva: 21, montant_tva: 52.5, montant_tvac: 302.5, paye_par_agence: true, refacturable: true, created_at: '2026-04-05T14:00:00Z', updated_at: '2026-04-05T14:00:00Z', biens: { adresse: 'Rue de Gembloux 14, 5030 Gembloux' }, rental_units: null },
  { id: 'df-02', bien_id: 'db-06', rental_unit_id: 'du-07', mois_concerne: DEMO_MOIS_ISO, date_frais: '2026-04-12', libelle: 'Peinture cage escalier', montant_htva: 480, taux_tva: 21, montant_tva: 100.8, montant_tvac: 580.8, paye_par_agence: true, refacturable: true, created_at: '2026-04-12T10:00:00Z', updated_at: '2026-04-12T10:00:00Z', biens: { adresse: 'Rue de la Station 17, 5030 Gembloux' }, rental_units: { libelle: 'Appartement 3 ch.' } },
  { id: 'df-03', bien_id: 'db-09', rental_unit_id: null, mois_concerne: DEMO_MOIS_ISO, date_frais: '2026-04-18', libelle: 'Réparation chaudière commune', montant_htva: 320, taux_tva: 21, montant_tva: 67.2, montant_tvac: 387.2, paye_par_agence: false, refacturable: true, created_at: '2026-04-18T09:00:00Z', updated_at: '2026-04-18T09:00:00Z', biens: { adresse: 'Rue Victor Hugo 12, 5190 Jemeppe' }, rental_units: null },
  { id: 'df-04', bien_id: 'db-07', rental_unit_id: null, mois_concerne: DEMO_MOIS_ISO, date_frais: '2026-04-20', libelle: "Entretien jardinage (non refacturable)", montant_htva: 150, taux_tva: 21, montant_tva: 31.5, montant_tvac: 181.5, paye_par_agence: true, refacturable: false, created_at: '2026-04-20T09:00:00Z', updated_at: '2026-04-20T09:00:00Z', biens: { adresse: 'Impasse des Coquelicots 2, 5030 Gembloux' }, rental_units: null },
]

// ─── Biens avec propriétaires (pour décomptes & sélecteur) ───────────────────

export const DEMO_BIENS_ACTIFS = DEMO_BIENS.map(b => {
  const proprio = DEMO_PROPRIETAIRES.find(p => p.id === b.proprietaire_id)!
  const units = DEMO_RENTAL_UNITS.filter(u => u.bien_id === b.id)
  return { ...b, proprietaires: proprio, rental_units: units }
})

export const DEMO_BIENS_SELECT = DEMO_BIENS_ACTIFS.map(b => ({
  id: b.id,
  adresse: b.adresse,
  rental_units: b.rental_units.map(u => ({ id: u.id, libelle: u.libelle })),
}))

// ─── Owner Statements (mois précédent) ────────────────────────────────────────

export const DEMO_OWNER_STATEMENTS: (OwnerStatement & {
  biens: { adresse: string }
  proprietaires: { nom_complet: string }
})[] = [
  { id: 'dos-01', proprietaire_id: 'dp-01', bien_id: 'db-01', mois_concerne: DEMO_PREV_MOIS_ISO, total_percu: 1610, total_frais_tvac: 0, honoraires_htva: 112.7, honoraires_tva: 23.67, honoraires_tvac: 136.37, solde_proprietaire: 1473.63, pdf_storage_path: null, genere_le: '2026-04-02T10:00:00Z', created_at: '2026-04-02T10:00:00Z', updated_at: '2026-04-02T10:00:00Z', biens: { adresse: 'Rue de Gembloux 14, 5030 Gembloux' }, proprietaires: { nom_complet: 'Vanderborght & Gilon' } },
  { id: 'dos-02', proprietaire_id: 'dp-02', bien_id: 'db-02', mois_concerne: DEMO_PREV_MOIS_ISO, total_percu: 910, total_frais_tvac: 0, honoraires_htva: 65.6, honoraires_tva: 13.78, honoraires_tvac: 79.38, solde_proprietaire: 830.62, pdf_storage_path: null, genere_le: '2026-04-02T10:00:00Z', created_at: '2026-04-02T10:00:00Z', updated_at: '2026-04-02T10:00:00Z', biens: { adresse: 'Rue du Tilleul 22, 1348 Louvain-la-Neuve' }, proprietaires: { nom_complet: 'Madame Francesca TRISCIUOGLIO' } },
  { id: 'dos-03', proprietaire_id: 'dp-05', bien_id: 'db-05', mois_concerne: DEMO_PREV_MOIS_ISO, total_percu: 1070, total_frais_tvac: 121, honoraires_htva: 66.5, honoraires_tva: 13.97, honoraires_tvac: 80.47, solde_proprietaire: 868.53, pdf_storage_path: null, genere_le: '2026-04-02T10:00:00Z', created_at: '2026-04-02T10:00:00Z', updated_at: '2026-04-02T10:00:00Z', biens: { adresse: 'Rue des Chapeliers 3, 5030 Gembloux' }, proprietaires: { nom_complet: 'Madame PAQUAY Marie-Louise' } },
]

// ─── Bank Imports ─────────────────────────────────────────────────────────────

export const DEMO_BANK_IMPORTS: BankImport[] = [
  { id: 'dbi-01', file_name: 'extrait_crelan_mars_2026.pdf', storage_path: null, parse_method: 'text', status: 'traite', period_start: '2026-03-01', period_end: '2026-03-31', total_movements: 18, matched_movements: 15, ignored_movements: 2, notes: null, created_at: '2026-04-01T08:30:00Z', updated_at: '2026-04-01T09:00:00Z' },
  { id: 'dbi-02', file_name: 'extrait_bnp_mars_2026.pdf', storage_path: null, parse_method: 'ai', status: 'traite', period_start: '2026-03-01', period_end: '2026-03-31', total_movements: 12, matched_movements: 11, ignored_movements: 0, notes: null, created_at: '2026-04-01T09:00:00Z', updated_at: '2026-04-01T09:30:00Z' },
  { id: 'dbi-03', file_name: 'extrait_crelan_avril_2026.pdf', storage_path: null, parse_method: 'text', status: 'en_cours', period_start: '2026-04-01', period_end: '2026-04-15', total_movements: 8, matched_movements: 5, ignored_movements: 0, notes: null, created_at: '2026-04-16T10:00:00Z', updated_at: '2026-04-16T10:05:00Z' },
]

// ─── Bank Movements (à valider) ───────────────────────────────────────────────

export const DEMO_BANK_MOVEMENTS: BankMovement[] = [
  { id: 'dbm-03', import_id: 'dbi-03', operation_date: '2026-04-05', value_date: '2026-04-07', direction: 'credit', amount: 790, currency: 'EUR', counterparty_name: 'BENALI AHMED', counterparty_iban: 'BE12 3456 7890 1234', communication: 'loyer avril 2026', raw_label: 'BENALI AHMED - loyer avril 2026', category: 'loyer', status: 'a_valider', match_score: 95, suggested_locataire_id: 'dl-05', suggested_bien_id: 'db-04', paiement_id: null, dedupe_hash: 'hash-03', notes: null, created_at: '2026-04-16T10:00:00Z', updated_at: '2026-04-16T10:00:00Z' },
  { id: 'dbm-04', import_id: 'dbi-03', operation_date: '2026-04-08', value_date: '2026-04-09', direction: 'credit', amount: 660, currency: 'EUR', counterparty_name: 'SIMON NATHALIE', counterparty_iban: 'BE98 7654 3210 9876', communication: 'appart B jemeppe', raw_label: 'SIMON NATHALIE - appart B jemeppe', category: 'loyer', status: 'a_valider', match_score: 88, suggested_locataire_id: 'dl-11', suggested_bien_id: 'db-09', paiement_id: null, dedupe_hash: 'hash-04', notes: null, created_at: '2026-04-16T10:00:00Z', updated_at: '2026-04-16T10:00:00Z' },
  { id: 'dbm-05', import_id: 'dbi-03', operation_date: '2026-04-12', value_date: '2026-04-14', direction: 'credit', amount: 745, currency: 'EUR', counterparty_name: 'INCONNU PAIEMENT', counterparty_iban: 'BE55 1234 5678 0000', communication: 'ref loc 2026-04', raw_label: 'INCONNU PAIEMENT', category: 'loyer', status: 'a_valider', match_score: 30, suggested_locataire_id: null, suggested_bien_id: null, paiement_id: null, dedupe_hash: 'hash-05', notes: null, created_at: '2026-04-16T10:00:00Z', updated_at: '2026-04-16T10:00:00Z' },
]

// ─── Portefeuille (structure imbriquée profonde) ───────────────────────────────

export const DEMO_PORTEFEUILLE = DEMO_PROPRIETAIRES.map(p => ({
  ...p,
  biens: DEMO_BIENS.filter(b => b.proprietaire_id === p.id).map(b => ({
    ...b,
    rental_units: DEMO_RENTAL_UNITS.filter(u => u.bien_id === b.id).map(u => ({
      ...u,
      locataires: DEMO_LOCATAIRES.filter(l => l.rental_unit_id === u.id),
    })),
  })),
}))

// ─── Locataires avec unités (pour page Locataires) ────────────────────────────

export const DEMO_LOCATAIRES_AVEC_UNITS = DEMO_LOCATAIRES.map(loc => {
  const unit = DEMO_RENTAL_UNITS.find(u => u.id === loc.rental_unit_id)!
  const bien = DEMO_BIENS.find(b => b.id === unit.bien_id)!
  const proprio = DEMO_PROPRIETAIRES.find(p => p.id === bien.proprietaire_id)!
  return {
    ...loc,
    rental_units: {
      libelle: unit.libelle,
      loyer_mensuel: unit.loyer_mensuel,
      charges_mensuelles: unit.charges_mensuelles,
      biens: {
        adresse: bien.adresse,
        proprietaires: { nom_complet: proprio.nom_complet },
      },
    },
  }
})

// ─── Données de réconciliation ────────────────────────────────────────────────

export const DEMO_RECONCILIATION_LOCATAIRES = DEMO_LOCATAIRES.map(loc => {
  const unit = DEMO_RENTAL_UNITS.find(u => u.id === loc.rental_unit_id)!
  const bien = DEMO_BIENS.find(b => b.id === unit.bien_id)!
  const proprio = DEMO_PROPRIETAIRES.find(p => p.id === bien.proprietaire_id)!
  return {
    ...loc,
    rental_units: {
      ...unit,
      biens: {
        ...bien,
        proprietaires: proprio,
      },
    },
  }
})

// ─── Dashboard KPIs ───────────────────────────────────────────────────────────

export function getDemoDashboardKpis() {
  const totalAttendu = DEMO_EXPECTED_RENTS.reduce((s, r) => s + r.loyer_attendu + r.charges_attendues, 0)
  const paiementsBase = DEMO_PAIEMENTS.filter(p => p.mois_concerne === DEMO_MOIS_ISO)
  const totalPercu = paiementsBase.reduce((s, p) => s + p.total_percu, 0)
  const nbPayes = paiementsBase.filter(p => p.statut === 'paye').length
  const locatairesPayants = new Set(paiementsBase.map(p => p.locataire_id))
  const nbAttendusTot = DEMO_EXPECTED_RENTS.length
  const nbImpayes = nbAttendusTot - locatairesPayants.size
  const taux = totalAttendu > 0 ? (totalPercu / totalAttendu) * 100 : 0
  return { totalAttendu, totalPercu, nbPayes, nbImpayes, nbAttendusTot, taux }
}

// ─── Paramètres agence ────────────────────────────────────────────────────────

export const DEMO_AGENCY_SETTINGS: AgencySettings = {
  id: 'demo-agency-01',
  nom: 'Mon Agence Immobilière (Démo)',
  adresse: 'Rue de la Gestion 1',
  code_postal: '5030',
  ville: 'Gembloux',
  pays: 'BE',
  telephone: '+32 81 00 11 22',
  email: 'agence@demo.be',
  numero_tva: 'BE0123.456.789',
  logo_url: null,
  pourcentage_honoraires: 7,
  taux_tva: 21,
  devise: 'EUR',
  updated_at: '2026-01-01T00:00:00Z',
}
