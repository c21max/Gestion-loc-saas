-- Durcissement backend : isolation tenant, intégrité métier et storage.

create or replace function assert_same_agency()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_table_name = 'biens' then
    if exists (
      select 1 from proprietaires p
      where p.id = new.proprietaire_id and p.agency_id <> new.agency_id
    ) then
      raise exception 'Le proprietaire appartient a une autre agence';
    end if;

  elsif tg_table_name = 'rental_units' then
    if exists (
      select 1 from biens b
      where b.id = new.bien_id and b.agency_id <> new.agency_id
    ) then
      raise exception 'Le bien appartient a une autre agence';
    end if;

  elsif tg_table_name = 'locataires' then
    if exists (
      select 1 from rental_units ru
      where ru.id = new.rental_unit_id and ru.agency_id <> new.agency_id
    ) then
      raise exception 'L unite locative appartient a une autre agence';
    end if;

  elsif tg_table_name = 'monthly_expected_rents' then
    if exists (
      select 1 from locataires l
      where l.id = new.locataire_id and l.agency_id <> new.agency_id
    ) then
      raise exception 'Le locataire appartient a une autre agence';
    end if;

    if exists (
      select 1 from rental_units ru
      where ru.id = new.rental_unit_id and ru.agency_id <> new.agency_id
    ) then
      raise exception 'L unite locative appartient a une autre agence';
    end if;

  elsif tg_table_name = 'paiements' then
    if exists (
      select 1 from locataires l
      where l.id = new.locataire_id and l.agency_id <> new.agency_id
    ) then
      raise exception 'Le locataire appartient a une autre agence';
    end if;

    if exists (
      select 1 from rental_units ru
      where ru.id = new.rental_unit_id and ru.agency_id <> new.agency_id
    ) then
      raise exception 'L unite locative appartient a une autre agence';
    end if;

    if exists (
      select 1 from biens b
      where b.id = new.bien_id and b.agency_id <> new.agency_id
    ) then
      raise exception 'Le bien appartient a une autre agence';
    end if;

    if new.bank_movement_id is not null and exists (
      select 1 from bank_movements bm
      where bm.id = new.bank_movement_id and bm.agency_id <> new.agency_id
    ) then
      raise exception 'Le mouvement bancaire appartient a une autre agence';
    end if;

  elsif tg_table_name = 'frais_divers' then
    if exists (
      select 1 from biens b
      where b.id = new.bien_id and b.agency_id <> new.agency_id
    ) then
      raise exception 'Le bien appartient a une autre agence';
    end if;

    if new.rental_unit_id is not null and exists (
      select 1 from rental_units ru
      where ru.id = new.rental_unit_id and ru.agency_id <> new.agency_id
    ) then
      raise exception 'L unite locative appartient a une autre agence';
    end if;

  elsif tg_table_name = 'owner_statements' then
    if exists (
      select 1 from proprietaires p
      where p.id = new.proprietaire_id and p.agency_id <> new.agency_id
    ) then
      raise exception 'Le proprietaire appartient a une autre agence';
    end if;

    if exists (
      select 1 from biens b
      where b.id = new.bien_id and b.agency_id <> new.agency_id
    ) then
      raise exception 'Le bien appartient a une autre agence';
    end if;

  elsif tg_table_name = 'bank_movements' then
    if exists (
      select 1 from bank_imports bi
      where bi.id = new.import_id and bi.agency_id <> new.agency_id
    ) then
      raise exception 'L import bancaire appartient a une autre agence';
    end if;

    if new.suggested_locataire_id is not null and exists (
      select 1 from locataires l
      where l.id = new.suggested_locataire_id and l.agency_id <> new.agency_id
    ) then
      raise exception 'Le locataire suggere appartient a une autre agence';
    end if;

    if new.suggested_bien_id is not null and exists (
      select 1 from biens b
      where b.id = new.suggested_bien_id and b.agency_id <> new.agency_id
    ) then
      raise exception 'Le bien suggere appartient a une autre agence';
    end if;

  elsif tg_table_name = 'payment_aliases' then
    if exists (
      select 1 from locataires l
      where l.id = new.locataire_id and l.agency_id <> new.agency_id
    ) then
      raise exception 'Le locataire appartient a une autre agence';
    end if;

    if new.bien_id is not null and exists (
      select 1 from biens b
      where b.id = new.bien_id and b.agency_id <> new.agency_id
    ) then
      raise exception 'Le bien appartient a une autre agence';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists biens_same_agency on biens;
create trigger biens_same_agency
  before insert or update of agency_id, proprietaire_id on biens
  for each row execute function assert_same_agency();

drop trigger if exists rental_units_same_agency on rental_units;
create trigger rental_units_same_agency
  before insert or update of agency_id, bien_id on rental_units
  for each row execute function assert_same_agency();

drop trigger if exists locataires_same_agency on locataires;
create trigger locataires_same_agency
  before insert or update of agency_id, rental_unit_id on locataires
  for each row execute function assert_same_agency();

drop trigger if exists monthly_expected_rents_same_agency on monthly_expected_rents;
create trigger monthly_expected_rents_same_agency
  before insert or update of agency_id, locataire_id, rental_unit_id on monthly_expected_rents
  for each row execute function assert_same_agency();

drop trigger if exists paiements_same_agency on paiements;
create trigger paiements_same_agency
  before insert or update of agency_id, locataire_id, rental_unit_id, bien_id, bank_movement_id on paiements
  for each row execute function assert_same_agency();

drop trigger if exists frais_divers_same_agency on frais_divers;
create trigger frais_divers_same_agency
  before insert or update of agency_id, bien_id, rental_unit_id on frais_divers
  for each row execute function assert_same_agency();

drop trigger if exists owner_statements_same_agency on owner_statements;
create trigger owner_statements_same_agency
  before insert or update of agency_id, proprietaire_id, bien_id on owner_statements
  for each row execute function assert_same_agency();

drop trigger if exists bank_movements_same_agency on bank_movements;
create trigger bank_movements_same_agency
  before insert or update of agency_id, import_id, suggested_locataire_id, suggested_bien_id on bank_movements
  for each row execute function assert_same_agency();

drop trigger if exists payment_aliases_same_agency on payment_aliases;
create trigger payment_aliases_same_agency
  before insert or update of agency_id, locataire_id, bien_id on payment_aliases
  for each row execute function assert_same_agency();

create unique index if not exists paiements_bank_movement_id_key
  on paiements (bank_movement_id)
  where bank_movement_id is not null;

create unique index if not exists payment_aliases_rpc_upsert_key
  on payment_aliases (locataire_id, counterparty_iban, counterparty_name_normalized)
  nulls not distinct;

drop policy if exists "authenticated can create agencies" on agencies;

drop policy if exists "agency storage upload" on storage.objects;
drop policy if exists "agency storage read" on storage.objects;
drop policy if exists "agency storage delete" on storage.objects;

create policy "agency storage upload" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'bank-statements'
    and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and split_part(name, '/', 1)::uuid = current_agency_id()
  );

create policy "agency storage read" on storage.objects for select to authenticated
  using (
    bucket_id = 'bank-statements'
    and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and split_part(name, '/', 1)::uuid = current_agency_id()
  );

create policy "agency storage delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'bank-statements'
    and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and split_part(name, '/', 1)::uuid = current_agency_id()
  );

create or replace function delete_bank_import(p_import_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_storage_path text;
  v_agency_id uuid := current_agency_id();
begin
  if v_agency_id is null then
    raise exception 'Aucune agence courante';
  end if;

  update paiements p
  set bank_movement_id = null, statut = 'en_attente'
  from bank_movements bm
  where bm.import_id = p_import_id
    and p.bank_movement_id = bm.id
    and p.agency_id = v_agency_id
    and bm.agency_id = v_agency_id;

  select storage_path into v_storage_path
  from bank_imports
  where id = p_import_id and agency_id = v_agency_id;

  if v_storage_path is null then
    raise exception 'Import bancaire introuvable';
  end if;

  delete from bank_imports where id = p_import_id and agency_id = v_agency_id;

  delete from storage.objects
  where bucket_id = 'bank-statements'
    and name = v_storage_path
    and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and split_part(name, '/', 1)::uuid = v_agency_id;
end;
$$;

notify pgrst, 'reload schema';
