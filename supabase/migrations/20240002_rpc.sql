-- RPC : générer les loyers attendus pour N mois glissants
create or replace function generate_expected_rents(months_ahead int default 12)
returns void language plpgsql security definer as $$
declare
  v_locataire record;
  v_mois date;
  v_loyer numeric(10,2);
  v_charges numeric(10,2);
begin
  -- Pour chaque locataire actif
  for v_locataire in
    select l.id as locataire_id, l.rental_unit_id,
           coalesce(l.loyer_mensuel_override, ru.loyer_mensuel) as loyer,
           coalesce(l.charges_mensuelles_override, ru.charges_mensuelles) as charges
    from locataires l
    join rental_units ru on ru.id = l.rental_unit_id
    where l.statut = 'actif'
  loop
    -- Pour chaque mois des 12 derniers mois + months_ahead mois futurs
    for i in -(12)..months_ahead loop
      v_mois := date_trunc('month', now()) + (i || ' months')::interval;

      insert into monthly_expected_rents (locataire_id, rental_unit_id, mois_concerne, loyer_attendu, charges_attendues)
      values (v_locataire.locataire_id, v_locataire.rental_unit_id, v_mois, v_locataire.loyer, v_locataire.charges)
      on conflict (locataire_id, mois_concerne) do update
        set loyer_attendu = excluded.loyer_attendu,
            charges_attendues = excluded.charges_attendues;
    end loop;
  end loop;
end;
$$;

-- RPC : supprimer un import et ses dépendances (cascade complète avec storage)
create or replace function delete_bank_import(p_import_id uuid)
returns void language plpgsql security definer as $$
declare
  v_storage_path text;
begin
  -- Remettre les paiements associés à "en_attente" et déconnecter le mouvement
  update paiements p
  set bank_movement_id = null, statut = 'en_attente'
  from bank_movements bm
  where bm.import_id = p_import_id and p.bank_movement_id = bm.id;

  -- Récupérer le path du fichier
  select storage_path into v_storage_path from bank_imports where id = p_import_id;

  -- Supprimer les mouvements (cascade depuis bank_imports)
  delete from bank_imports where id = p_import_id;

  -- Supprimer le fichier dans le bucket si présent
  if v_storage_path is not null then
    delete from storage.objects where bucket_id = 'bank-statements' and name = v_storage_path;
  end if;
end;
$$;

-- Vue dashboard KPIs du mois courant
create or replace view v_dashboard_kpis as
select
  date_trunc('month', now())::date as mois,
  coalesce(sum(mer.loyer_attendu + mer.charges_attendues), 0) as total_attendu,
  coalesce(sum(p.total_percu), 0) as total_percu,
  count(distinct case when p.statut = 'impaye' or p.id is null then mer.locataire_id end) as nb_impayes,
  count(distinct case when p.statut in ('paye','partiel') then p.locataire_id end) as nb_payes
from monthly_expected_rents mer
left join paiements p on p.locataire_id = mer.locataire_id
  and p.mois_concerne = mer.mois_concerne
where mer.mois_concerne = date_trunc('month', now())::date;
