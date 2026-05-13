-- Indexes composites alignes avec les filtres applicatifs courants.
-- Migration additive uniquement : aucun changement de comportement, RLS ou permissions.

create index if not exists paiements_agency_month_created_idx
  on paiements (agency_id, mois_concerne, created_at desc);

create index if not exists paiements_agency_locataire_month_idx
  on paiements (agency_id, locataire_id, mois_concerne);

create index if not exists paiements_agency_bank_movement_idx
  on paiements (agency_id, bank_movement_id)
  where bank_movement_id is not null;

create index if not exists frais_divers_agency_month_date_idx
  on frais_divers (agency_id, mois_concerne, date_frais desc);

create index if not exists owner_statements_agency_month_idx
  on owner_statements (agency_id, mois_concerne);

create index if not exists bank_imports_agency_created_idx
  on bank_imports (agency_id, created_at desc);

create index if not exists bank_movements_agency_import_idx
  on bank_movements (agency_id, import_id);

create index if not exists bank_movements_agency_status_idx
  on bank_movements (agency_id, status);

create index if not exists monthly_expected_rents_agency_month_idx
  on monthly_expected_rents (agency_id, mois_concerne);

create index if not exists locataires_agency_status_idx
  on locataires (agency_id, statut);

create index if not exists biens_agency_status_idx
  on biens (agency_id, statut);

create index if not exists rental_units_agency_bien_idx
  on rental_units (agency_id, bien_id);
