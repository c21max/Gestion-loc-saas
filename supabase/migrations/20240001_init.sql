-- Migration initiale : schéma complet gestion locative

-- Trigger updated_at (partagé par toutes les tables)
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Enums
create type proprietaire_type as enum ('personne_physique','societe','indivision');
create type bien_statut as enum ('actif','inactif','vendu');
create type locataire_statut as enum ('actif','sorti','prospect');
create type base_calcul_honoraires as enum ('loyer_seul','loyer_plus_charges');
create type paiement_statut as enum ('paye','partiel','impaye','en_attente');
create type bank_import_status as enum ('en_cours','traite','erreur');
create type bank_parse_method as enum ('text','ai','manual');
create type bank_movement_status as enum ('a_valider','apparie','ignore','paiement_cree','doublon');
create type bank_movement_category as enum ('loyer','charges','frais','autre');

-- Paramètres agence
create table agency_settings (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  adresse text, code_postal text, ville text,
  telephone text, email text, numero_tva text,
  pourcentage_honoraires numeric not null default 7,
  taux_tva numeric not null default 21,
  updated_at timestamptz not null default now()
);

create trigger agency_settings_updated_at before update on agency_settings
  for each row execute function set_updated_at();

alter table agency_settings enable row level security;
create policy "authenticated full access" on agency_settings
  for all to authenticated using (true) with check (true);

-- Propriétaires
create table proprietaires (
  id uuid primary key default gen_random_uuid(),
  nom_complet text not null,
  type_proprietaire proprietaire_type not null default 'personne_physique',
  adresse text, code_postal text, ville text, pays text,
  email text, telephone text, numero_tva text, notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger proprietaires_updated_at before update on proprietaires
  for each row execute function set_updated_at();

alter table proprietaires enable row level security;
create policy "authenticated full access" on proprietaires
  for all to authenticated using (true) with check (true);

-- Biens
create table biens (
  id uuid primary key default gen_random_uuid(),
  proprietaire_id uuid not null references proprietaires(id) on delete restrict,
  reference_interne text,
  adresse text not null,
  type_bien text,
  statut bien_statut not null default 'actif',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger biens_updated_at before update on biens
  for each row execute function set_updated_at();

alter table biens enable row level security;
create policy "authenticated full access" on biens
  for all to authenticated using (true) with check (true);

-- Unités locatives (loyers/charges TOUJOURS sur l'unité, jamais sur le bien)
create table rental_units (
  id uuid primary key default gen_random_uuid(),
  bien_id uuid not null references biens(id) on delete cascade,
  libelle text not null,
  loyer_mensuel numeric(10,2) not null default 0,
  charges_mensuelles numeric(10,2) not null default 0,
  pourcentage_honoraires numeric(5,2) not null default 7,
  taux_tva_honoraires numeric(5,2) not null default 21,
  base_calcul_honoraires base_calcul_honoraires not null default 'loyer_plus_charges',
  actif boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger rental_units_updated_at before update on rental_units
  for each row execute function set_updated_at();

alter table rental_units enable row level security;
create policy "authenticated full access" on rental_units
  for all to authenticated using (true) with check (true);

-- Locataires (rattachés à une unité)
create table locataires (
  id uuid primary key default gen_random_uuid(),
  rental_unit_id uuid not null references rental_units(id) on delete restrict,
  nom_complet text not null,
  email text, telephone text,
  date_debut_bail date, date_fin_bail date,
  statut locataire_statut not null default 'actif',
  loyer_mensuel_override numeric(10,2),
  charges_mensuelles_override numeric(10,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger locataires_updated_at before update on locataires
  for each row execute function set_updated_at();

alter table locataires enable row level security;
create policy "authenticated full access" on locataires
  for all to authenticated using (true) with check (true);

-- Loyers attendus mensuels
create table monthly_expected_rents (
  id uuid primary key default gen_random_uuid(),
  locataire_id uuid not null references locataires(id) on delete cascade,
  rental_unit_id uuid not null references rental_units(id) on delete cascade,
  mois_concerne date not null,
  loyer_attendu numeric(10,2) not null,
  charges_attendues numeric(10,2) not null,
  unique (locataire_id, mois_concerne)
);

alter table monthly_expected_rents enable row level security;
create policy "authenticated full access" on monthly_expected_rents
  for all to authenticated using (true) with check (true);

-- Paiements (date_paiement bancaire ≠ mois_concerne période)
create table paiements (
  id uuid primary key default gen_random_uuid(),
  locataire_id uuid not null references locataires(id) on delete restrict,
  rental_unit_id uuid not null references rental_units(id) on delete restrict,
  bien_id uuid not null references biens(id) on delete restrict,
  mois_concerne date not null,
  date_paiement date,
  loyer_htva numeric(10,2) not null default 0,
  charges numeric(10,2) not null default 0,
  indemnites numeric(10,2) not null default 0,
  degats_locatifs numeric(10,2) not null default 0,
  garantie_locative numeric(10,2) not null default 0,
  total_percu numeric(10,2) not null default 0,
  statut paiement_statut not null default 'paye',
  bank_movement_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on paiements (mois_concerne);
create index on paiements (locataire_id, mois_concerne);

create trigger paiements_updated_at before update on paiements
  for each row execute function set_updated_at();

alter table paiements enable row level security;
create policy "authenticated full access" on paiements
  for all to authenticated using (true) with check (true);

-- Frais divers
create table frais_divers (
  id uuid primary key default gen_random_uuid(),
  bien_id uuid not null references biens(id) on delete cascade,
  rental_unit_id uuid references rental_units(id) on delete set null,
  mois_concerne date not null,
  date_frais date,
  libelle text not null,
  montant_htva numeric(10,2) not null default 0,
  taux_tva numeric(5,2) not null default 21,
  montant_tva numeric(10,2) not null default 0,
  montant_tvac numeric(10,2) not null default 0,
  paye_par_agence boolean not null default true,
  refacturable boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger frais_divers_updated_at before update on frais_divers
  for each row execute function set_updated_at();

alter table frais_divers enable row level security;
create policy "authenticated full access" on frais_divers
  for all to authenticated using (true) with check (true);

-- Décomptes propriétaires
create table owner_statements (
  id uuid primary key default gen_random_uuid(),
  proprietaire_id uuid not null references proprietaires(id) on delete cascade,
  bien_id uuid not null references biens(id) on delete cascade,
  mois_concerne date not null,
  total_percu numeric(10,2) not null default 0,
  total_frais_tvac numeric(10,2) not null default 0,
  honoraires_htva numeric(10,2) not null default 0,
  honoraires_tva numeric(10,2) not null default 0,
  honoraires_tvac numeric(10,2) not null default 0,
  solde_proprietaire numeric(10,2) not null default 0,
  pdf_storage_path text,
  genere_le timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bien_id, mois_concerne)
);

create trigger owner_statements_updated_at before update on owner_statements
  for each row execute function set_updated_at();

alter table owner_statements enable row level security;
create policy "authenticated full access" on owner_statements
  for all to authenticated using (true) with check (true);

-- Imports bancaires
create table bank_imports (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  storage_path text,
  parse_method bank_parse_method not null default 'text',
  status bank_import_status not null default 'en_cours',
  period_start date, period_end date,
  total_movements int not null default 0,
  matched_movements int not null default 0,
  ignored_movements int not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger bank_imports_updated_at before update on bank_imports
  for each row execute function set_updated_at();

alter table bank_imports enable row level security;
create policy "authenticated full access" on bank_imports
  for all to authenticated using (true) with check (true);

-- Mouvements bancaires
create table bank_movements (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references bank_imports(id) on delete cascade,
  operation_date date not null,
  value_date date,
  direction text not null,
  amount numeric(10,2) not null,
  currency text not null default 'EUR',
  counterparty_name text,
  counterparty_iban text,
  communication text,
  raw_label text,
  category bank_movement_category not null default 'autre',
  status bank_movement_status not null default 'a_valider',
  match_score numeric(5,2),
  suggested_locataire_id uuid references locataires(id) on delete set null,
  suggested_bien_id uuid references biens(id) on delete set null,
  paiement_id uuid references paiements(id) on delete set null,
  dedupe_hash text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (import_id, dedupe_hash)
);

create trigger bank_movements_updated_at before update on bank_movements
  for each row execute function set_updated_at();

alter table bank_movements enable row level security;
create policy "authenticated full access" on bank_movements
  for all to authenticated using (true) with check (true);

-- Alias de paiement (apprentissage)
create table payment_aliases (
  id uuid primary key default gen_random_uuid(),
  locataire_id uuid not null references locataires(id) on delete cascade,
  bien_id uuid references biens(id) on delete set null,
  counterparty_name_normalized text,
  counterparty_iban text,
  source text not null default 'manual',
  times_used int not null default 0,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index on payment_aliases (locataire_id, coalesce(counterparty_iban,''), coalesce(counterparty_name_normalized,''));

create trigger payment_aliases_updated_at before update on payment_aliases
  for each row execute function set_updated_at();

alter table payment_aliases enable row level security;
create policy "authenticated full access" on payment_aliases
  for all to authenticated using (true) with check (true);

-- Bucket storage pour les extraits bancaires
insert into storage.buckets (id, name, public) values ('bank-statements', 'bank-statements', false);
create policy "authenticated upload" on storage.objects for insert to authenticated with check (bucket_id = 'bank-statements');
create policy "authenticated read" on storage.objects for select to authenticated using (bucket_id = 'bank-statements');
create policy "authenticated delete" on storage.objects for delete to authenticated using (bucket_id = 'bank-statements');
