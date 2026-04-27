-- Migration multi-tenant SaaS

create type agency_user_role as enum ('owner','admin','staff');

create table agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  postal_code text,
  city text,
  country text not null default 'BE',
  email text,
  phone text,
  vat_number text,
  logo_url text,
  default_vat_rate numeric(5,2) not null default 21,
  default_management_fee_percentage numeric(5,2) not null default 7,
  currency text not null default 'EUR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger agencies_updated_at before update on agencies
  for each row execute function set_updated_at();

create table agency_users (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role agency_user_role not null default 'staff',
  created_at timestamptz not null default now(),
  unique (agency_id, user_id)
);

create index agency_users_user_id_idx on agency_users (user_id);
create index agency_users_agency_id_idx on agency_users (agency_id);

create or replace function current_agency_id()
returns uuid language sql stable security definer set search_path = public as $$
  select au.agency_id
  from agency_users au
  where au.user_id = auth.uid()
  order by
    case au.role when 'owner' then 1 when 'admin' then 2 else 3 end,
    au.created_at
  limit 1
$$;

create or replace function is_agency_member(p_agency_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from agency_users au
    where au.agency_id = p_agency_id and au.user_id = auth.uid()
  )
$$;

create or replace function has_agency_role(p_agency_id uuid, p_roles agency_user_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from agency_users au
    where au.agency_id = p_agency_id
      and au.user_id = auth.uid()
      and au.role = any(p_roles)
  )
$$;

alter table agencies enable row level security;
alter table agency_users enable row level security;

create policy "members can read their agencies" on agencies
  for select to authenticated using (is_agency_member(id));
create policy "owners and admins can update agencies" on agencies
  for update to authenticated using (has_agency_role(id, array['owner','admin']::agency_user_role[]))
  with check (has_agency_role(id, array['owner','admin']::agency_user_role[]));
create policy "authenticated can create agencies" on agencies
  for insert to authenticated with check (true);

create policy "members can read memberships" on agency_users
  for select to authenticated using (is_agency_member(agency_id));
create policy "owners can manage memberships" on agency_users
  for all to authenticated using (has_agency_role(agency_id, array['owner']::agency_user_role[]))
  with check (has_agency_role(agency_id, array['owner']::agency_user_role[]));

create or replace function create_agency_for_current_user(p_name text)
returns agencies language plpgsql security definer set search_path = public as $$
declare
  v_agency agencies;
begin
  if auth.uid() is null then
    raise exception 'Utilisateur non authentifie';
  end if;

  insert into agencies (name)
  values (coalesce(nullif(trim(p_name), ''), 'Mon agence'))
  returning * into v_agency;

  insert into agency_users (agency_id, user_id, role)
  values (v_agency.id, auth.uid(), 'owner');

  insert into agency_settings (
    agency_id, nom, adresse, code_postal, ville, telephone, email, numero_tva,
    pourcentage_honoraires, taux_tva, pays, devise
  )
  values (
    v_agency.id, v_agency.name, v_agency.address, v_agency.postal_code, v_agency.city,
    v_agency.phone, v_agency.email, v_agency.vat_number,
    v_agency.default_management_fee_percentage, v_agency.default_vat_rate,
    v_agency.country, v_agency.currency
  )
  on conflict (agency_id) do nothing;

  return v_agency;
end;
$$;

notify pgrst, 'reload schema';

insert into agencies (
  id, name, city, country, default_vat_rate, default_management_fee_percentage, currency
) values (
  '00000000-0000-0000-0000-000000000001',
  'Agence de démonstration',
  'Gembloux',
  'BE',
  21,
  7,
  'EUR'
) on conflict (id) do nothing;

alter table agency_settings add column if not exists agency_id uuid references agencies(id) on delete cascade;
alter table agency_settings add column if not exists pays text not null default 'BE';
alter table agency_settings add column if not exists devise text not null default 'EUR';
alter table agency_settings add column if not exists logo_url text;
update agency_settings set agency_id = '00000000-0000-0000-0000-000000000001' where agency_id is null;
insert into agency_settings (
  agency_id, nom, ville, pourcentage_honoraires, taux_tva, pays, devise
) select
  '00000000-0000-0000-0000-000000000001',
  'Agence de démonstration',
  'Gembloux',
  7,
  21,
  'BE',
  'EUR'
where not exists (
  select 1 from agency_settings where agency_id = '00000000-0000-0000-0000-000000000001'
);
delete from agency_settings a
using agency_settings b
where a.agency_id = b.agency_id
  and a.ctid < b.ctid;
alter table agency_settings alter column agency_id set not null;
create unique index if not exists agency_settings_agency_id_key on agency_settings (agency_id);

alter table proprietaires add column if not exists agency_id uuid references agencies(id) on delete restrict;
alter table biens add column if not exists agency_id uuid references agencies(id) on delete restrict;
alter table rental_units add column if not exists agency_id uuid references agencies(id) on delete restrict;
alter table locataires add column if not exists agency_id uuid references agencies(id) on delete restrict;
alter table monthly_expected_rents add column if not exists agency_id uuid references agencies(id) on delete cascade;
alter table paiements add column if not exists agency_id uuid references agencies(id) on delete restrict;
alter table frais_divers add column if not exists agency_id uuid references agencies(id) on delete cascade;
alter table owner_statements add column if not exists agency_id uuid references agencies(id) on delete cascade;
alter table bank_imports add column if not exists agency_id uuid references agencies(id) on delete cascade;
alter table bank_movements add column if not exists agency_id uuid references agencies(id) on delete cascade;
alter table payment_aliases add column if not exists agency_id uuid references agencies(id) on delete cascade;

update proprietaires set agency_id = '00000000-0000-0000-0000-000000000001' where agency_id is null;
update biens set agency_id = p.agency_id from proprietaires p where biens.proprietaire_id = p.id and biens.agency_id is null;
update rental_units set agency_id = b.agency_id from biens b where rental_units.bien_id = b.id and rental_units.agency_id is null;
update locataires set agency_id = ru.agency_id from rental_units ru where locataires.rental_unit_id = ru.id and locataires.agency_id is null;
update monthly_expected_rents set agency_id = l.agency_id from locataires l where monthly_expected_rents.locataire_id = l.id and monthly_expected_rents.agency_id is null;
update paiements set agency_id = b.agency_id from biens b where paiements.bien_id = b.id and paiements.agency_id is null;
update frais_divers set agency_id = b.agency_id from biens b where frais_divers.bien_id = b.id and frais_divers.agency_id is null;
update owner_statements set agency_id = b.agency_id from biens b where owner_statements.bien_id = b.id and owner_statements.agency_id is null;
update bank_imports set agency_id = '00000000-0000-0000-0000-000000000001' where agency_id is null;
update bank_movements set agency_id = bi.agency_id from bank_imports bi where bank_movements.import_id = bi.id and bank_movements.agency_id is null;
update payment_aliases set agency_id = l.agency_id from locataires l where payment_aliases.locataire_id = l.id and payment_aliases.agency_id is null;

alter table proprietaires alter column agency_id set not null;
alter table biens alter column agency_id set not null;
alter table rental_units alter column agency_id set not null;
alter table locataires alter column agency_id set not null;
alter table monthly_expected_rents alter column agency_id set not null;
alter table paiements alter column agency_id set not null;
alter table frais_divers alter column agency_id set not null;
alter table owner_statements alter column agency_id set not null;
alter table bank_imports alter column agency_id set not null;
alter table bank_movements alter column agency_id set not null;
alter table payment_aliases alter column agency_id set not null;

create index if not exists proprietaires_agency_id_idx on proprietaires (agency_id);
create index if not exists biens_agency_id_idx on biens (agency_id);
create index if not exists rental_units_agency_id_idx on rental_units (agency_id);
create index if not exists locataires_agency_id_idx on locataires (agency_id);
create index if not exists monthly_expected_rents_agency_id_idx on monthly_expected_rents (agency_id);
create index if not exists paiements_agency_id_idx on paiements (agency_id);
create index if not exists frais_divers_agency_id_idx on frais_divers (agency_id);
create index if not exists owner_statements_agency_id_idx on owner_statements (agency_id);
create index if not exists bank_imports_agency_id_idx on bank_imports (agency_id);
create index if not exists bank_movements_agency_id_idx on bank_movements (agency_id);
create index if not exists payment_aliases_agency_id_idx on payment_aliases (agency_id);

drop policy if exists "authenticated full access" on agency_settings;
drop policy if exists "authenticated full access" on proprietaires;
drop policy if exists "authenticated full access" on biens;
drop policy if exists "authenticated full access" on rental_units;
drop policy if exists "authenticated full access" on locataires;
drop policy if exists "authenticated full access" on monthly_expected_rents;
drop policy if exists "authenticated full access" on paiements;
drop policy if exists "authenticated full access" on frais_divers;
drop policy if exists "authenticated full access" on owner_statements;
drop policy if exists "authenticated full access" on bank_imports;
drop policy if exists "authenticated full access" on bank_movements;
drop policy if exists "authenticated full access" on payment_aliases;

create policy "agency scoped access" on agency_settings
  for all to authenticated using (is_agency_member(agency_id)) with check (is_agency_member(agency_id));
create policy "agency scoped access" on proprietaires
  for all to authenticated using (is_agency_member(agency_id)) with check (is_agency_member(agency_id));
create policy "agency scoped access" on biens
  for all to authenticated using (is_agency_member(agency_id)) with check (is_agency_member(agency_id));
create policy "agency scoped access" on rental_units
  for all to authenticated using (is_agency_member(agency_id)) with check (is_agency_member(agency_id));
create policy "agency scoped access" on locataires
  for all to authenticated using (is_agency_member(agency_id)) with check (is_agency_member(agency_id));
create policy "agency scoped access" on monthly_expected_rents
  for all to authenticated using (is_agency_member(agency_id)) with check (is_agency_member(agency_id));
create policy "agency scoped access" on paiements
  for all to authenticated using (is_agency_member(agency_id)) with check (is_agency_member(agency_id));
create policy "agency scoped access" on frais_divers
  for all to authenticated using (is_agency_member(agency_id)) with check (is_agency_member(agency_id));
create policy "agency scoped access" on owner_statements
  for all to authenticated using (is_agency_member(agency_id)) with check (is_agency_member(agency_id));
create policy "agency scoped access" on bank_imports
  for all to authenticated using (is_agency_member(agency_id)) with check (is_agency_member(agency_id));
create policy "agency scoped access" on bank_movements
  for all to authenticated using (is_agency_member(agency_id)) with check (is_agency_member(agency_id));
create policy "agency scoped access" on payment_aliases
  for all to authenticated using (is_agency_member(agency_id)) with check (is_agency_member(agency_id));

drop policy if exists "authenticated upload" on storage.objects;
drop policy if exists "authenticated read" on storage.objects;
drop policy if exists "authenticated delete" on storage.objects;
create policy "agency storage upload" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'bank-statements'
    and (
      (
        split_part(name, '/', 1) ~* '^[0-9a-f-]{36}$'
        and split_part(name, '/', 1)::uuid = current_agency_id()
      )
      or (
        split_part(name, '/', 1) !~* '^[0-9a-f-]{36}$'
        and current_agency_id() = '00000000-0000-0000-0000-000000000001'
      )
    )
  );
create policy "agency storage read" on storage.objects for select to authenticated
  using (
    bucket_id = 'bank-statements'
    and (
      (
        split_part(name, '/', 1) ~* '^[0-9a-f-]{36}$'
        and split_part(name, '/', 1)::uuid = current_agency_id()
      )
      or (
        split_part(name, '/', 1) !~* '^[0-9a-f-]{36}$'
        and current_agency_id() = '00000000-0000-0000-0000-000000000001'
      )
    )
  );
create policy "agency storage delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'bank-statements'
    and (
      (
        split_part(name, '/', 1) ~* '^[0-9a-f-]{36}$'
        and split_part(name, '/', 1)::uuid = current_agency_id()
      )
      or (
        split_part(name, '/', 1) !~* '^[0-9a-f-]{36}$'
        and current_agency_id() = '00000000-0000-0000-0000-000000000001'
      )
    )
  );

create or replace function generate_expected_rents(months_ahead int default 12)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_agency_id uuid := current_agency_id();
  v_locataire record;
  v_mois date;
begin
  if v_agency_id is null then
    raise exception 'Aucune agence courante';
  end if;

  for v_locataire in
    select l.id as locataire_id, l.rental_unit_id,
           coalesce(l.loyer_mensuel_override, ru.loyer_mensuel) as loyer,
           coalesce(l.charges_mensuelles_override, ru.charges_mensuelles) as charges
    from locataires l
    join rental_units ru on ru.id = l.rental_unit_id
    where l.statut = 'actif'
      and l.agency_id = v_agency_id
  loop
    for i in -(12)..months_ahead loop
      v_mois := date_trunc('month', now()) + (i || ' months')::interval;

      insert into monthly_expected_rents (agency_id, locataire_id, rental_unit_id, mois_concerne, loyer_attendu, charges_attendues)
      values (v_agency_id, v_locataire.locataire_id, v_locataire.rental_unit_id, v_mois, v_locataire.loyer, v_locataire.charges)
      on conflict (locataire_id, mois_concerne) do update
        set loyer_attendu = excluded.loyer_attendu,
            charges_attendues = excluded.charges_attendues;
    end loop;
  end loop;
end;
$$;

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

  delete from bank_imports where id = p_import_id and agency_id = v_agency_id;

  if v_storage_path is not null then
    delete from storage.objects
    where bucket_id = 'bank-statements'
      and name = v_storage_path
      and split_part(name, '/', 1) ~* '^[0-9a-f-]{36}$'
      and split_part(name, '/', 1)::uuid = v_agency_id;
  end if;
end;
$$;
