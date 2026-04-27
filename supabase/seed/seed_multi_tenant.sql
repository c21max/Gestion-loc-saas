-- Seed multi-tenant : données de départ rattachées à l'agence de démonstration.
-- À lancer dans Supabase SQL Editor après les migrations.

do $$
declare
  v_agency_id uuid := '00000000-0000-0000-0000-000000000001';
begin
  insert into agencies (
    id, name, city, country, default_vat_rate, default_management_fee_percentage, currency
  ) values (
    v_agency_id, 'Agence de démonstration', 'Gembloux', 'BE', 21, 7, 'EUR'
  )
  on conflict (id) do update set
    name = excluded.name,
    updated_at = now();

  insert into agency_settings (
    agency_id, nom, ville, pourcentage_honoraires, taux_tva, pays, devise
  ) values (
    v_agency_id, 'Agence de démonstration', 'Gembloux', 7, 21, 'BE', 'EUR'
  )
  on conflict (agency_id) do update set
    nom = excluded.nom,
    ville = excluded.ville,
    pourcentage_honoraires = excluded.pourcentage_honoraires,
    taux_tva = excluded.taux_tva,
    pays = excluded.pays,
    devise = excluded.devise;
end $$;

insert into agency_users (agency_id, user_id, role)
select
  '00000000-0000-0000-0000-000000000001',
  id,
  'owner'
from auth.users
where email = 'thomas@century21immodemeuse.be'
on conflict (agency_id, user_id) do nothing;

update agency_users
set created_at = now() - interval '10 years'
where agency_id = '00000000-0000-0000-0000-000000000001'
  and user_id = (
    select id from auth.users
    where email = 'thomas@century21immodemeuse.be'
  );

with owner_seed(nom_complet, type_proprietaire, adresse, code_postal, ville) as (
  values
    ('Adrien Vanderborght et Laurence Gilon', 'indivision'::proprietaire_type, null, null, null),
    ('Madame Francesca TRISCIUOGLIO', 'personne_physique'::proprietaire_type, null, null, null),
    ('Madame Valentina TRISCIUOGLIO', 'personne_physique'::proprietaire_type, null, null, null),
    ('Monsieur Aldo TRISCIUOGLIO', 'personne_physique'::proprietaire_type, null, null, null),
    ('Madame PAQUAY Marie-Louise', 'personne_physique'::proprietaire_type, null, null, null),
    ('Madame Véronique EECKHOUDT', 'personne_physique'::proprietaire_type, null, null, null),
    ('Monsieur Christophe BELLON', 'personne_physique'::proprietaire_type, null, null, null),
    ('SRL Belgique sous-traitance', 'societe'::proprietaire_type, null, null, null),
    ('(proprio Jemeppe)', 'personne_physique'::proprietaire_type, null, null, null),
    ('RENSON Philippe', 'personne_physique'::proprietaire_type, 'Chaussée de Tirlemont, 117', '5030', 'Gembloux')
)
insert into proprietaires (agency_id, nom_complet, type_proprietaire, adresse, code_postal, ville)
select
  '00000000-0000-0000-0000-000000000001',
  os.nom_complet,
  os.type_proprietaire,
  os.adresse,
  os.code_postal,
  os.ville
from owner_seed os
where not exists (
  select 1 from proprietaires p
  where p.agency_id = '00000000-0000-0000-0000-000000000001'
    and p.nom_complet = os.nom_complet
);

with bien_seed(proprio, adresse, type_bien) as (
  values
    ('Adrien Vanderborght et Laurence Gilon', 'Rue Paul Tournay, 14/5 - 5030 Gembloux', 'Appartement'),
    ('Madame Francesca TRISCIUOGLIO', 'Place de l''Équerre, 61/201 - 1348 LLN', 'Appartement'),
    ('Madame Valentina TRISCIUOGLIO', 'Place de l''Équerre, 61/203 - 1348 LLN', 'Appartement'),
    ('Monsieur Aldo TRISCIUOGLIO', 'Place de l''Équerre, 61/101 - 1348 LLN', 'Appartement'),
    ('Madame PAQUAY Marie-Louise', 'Rue Marcel Thiry, 1/303 - 1348 LLN', 'Appartement'),
    ('Madame Véronique EECKHOUDT', 'Rue Marcel Thiry, 3 - 1348 LLN', 'Appartement'),
    ('Monsieur Christophe BELLON', 'Avenue Maurice Maeterlinck, 3M/201 - 1348 LLN', 'Appartement'),
    ('SRL Belgique sous-traitance', 'Chaussée Romaine, 115/12 - 5030 Gembloux', 'Bien locatif'),
    ('(proprio Jemeppe)', 'Rue de Jemeppe, 19 - 5190 Jemeppe-sur-Sambre', 'Bien locatif'),
    ('RENSON Philippe', 'Chaussée de Tirlemont, 119 - 5030 Gembloux', 'Maison'),
    ('RENSON Philippe', 'Chaussée de Tirlemont, 177 - 5030 Gembloux', 'Maison'),
    ('RENSON Philippe', 'Rue des Champs, 11 - 5030 Gembloux', 'Immeuble multi-occupants')
)
insert into biens (agency_id, proprietaire_id, adresse, type_bien, statut)
select
  '00000000-0000-0000-0000-000000000001',
  p.id,
  bs.adresse,
  bs.type_bien,
  'actif'
from bien_seed bs
join proprietaires p
  on p.agency_id = '00000000-0000-0000-0000-000000000001'
 and p.nom_complet = bs.proprio
where not exists (
  select 1 from biens b
  where b.agency_id = '00000000-0000-0000-0000-000000000001'
    and b.adresse = bs.adresse
);

with unit_seed(bien_adresse, libelle, loyer, charges, pct_hon, base_calcul, locataire) as (
  values
    ('Rue Paul Tournay, 14/5 - 5030 Gembloux', 'Appartement', 915::numeric, 125::numeric, 8::numeric, 'loyer_plus_charges'::base_calcul_honoraires, 'Moreno - Coconi'),
    ('Place de l''Équerre, 61/201 - 1348 LLN', 'Appartement 201', 660, 55, 7, 'loyer_plus_charges'::base_calcul_honoraires, 'Camille MESSAGER'),
    ('Place de l''Équerre, 61/203 - 1348 LLN', 'Appartement 203', 675, 65, 7, 'loyer_plus_charges'::base_calcul_honoraires, 'Matteo Hollingworth'),
    ('Place de l''Équerre, 61/101 - 1348 LLN', 'Appartement 101', 585, 35, 7, 'loyer_plus_charges'::base_calcul_honoraires, 'Maxence Simon'),
    ('Rue Marcel Thiry, 1/303 - 1348 LLN', 'Appartement 303', 815, 85, 10, 'loyer_seul'::base_calcul_honoraires, 'De Longree - Defraigne'),
    ('Rue Marcel Thiry, 3 - 1348 LLN', 'Appartement', 1030, 120, 8, 'loyer_plus_charges'::base_calcul_honoraires, 'Léa De Carrelo Soares'),
    ('Avenue Maurice Maeterlinck, 3M/201 - 1348 LLN', 'Appartement 201', 900, 100, 8, 'loyer_plus_charges'::base_calcul_honoraires, 'RAVEL-REBAUDO'),
    ('Chaussée Romaine, 115/12 - 5030 Gembloux', 'Unité principale', 1050, 180, 10, 'loyer_seul'::base_calcul_honoraires, 'Posteau-De Lannoy'),
    ('Rue de Jemeppe, 19 - 5190 Jemeppe-sur-Sambre', 'Unité principale', 950, 130, 10, 'loyer_seul'::base_calcul_honoraires, 'EZBAT SRL'),
    ('Chaussée de Tirlemont, 119 - 5030 Gembloux', 'Maison', 1150, 0, 10, 'loyer_seul'::base_calcul_honoraires, 'MIRGUET'),
    ('Chaussée de Tirlemont, 177 - 5030 Gembloux', 'Maison', 865, 0, 10, 'loyer_seul'::base_calcul_honoraires, 'MELOTTE'),
    ('Rue des Champs, 11 - 5030 Gembloux', 'Pierre', 550, 50, 10, 'loyer_seul'::base_calcul_honoraires, 'Pierre'),
    ('Rue des Champs, 11 - 5030 Gembloux', 'Bonnet', 670, 45, 10, 'loyer_seul'::base_calcul_honoraires, 'Bonnet'),
    ('Rue des Champs, 11 - 5030 Gembloux', 'Nina', 0, 0, 10, 'loyer_seul'::base_calcul_honoraires, 'Nina')
),
inserted_units as (
  insert into rental_units (
    agency_id, bien_id, libelle, loyer_mensuel, charges_mensuelles,
    pourcentage_honoraires, taux_tva_honoraires, base_calcul_honoraires, actif
  )
  select
    '00000000-0000-0000-0000-000000000001',
    b.id,
    us.libelle,
    us.loyer,
    us.charges,
    us.pct_hon,
    21,
    us.base_calcul,
    true
  from unit_seed us
  join biens b
    on b.agency_id = '00000000-0000-0000-0000-000000000001'
   and b.adresse = us.bien_adresse
  where not exists (
    select 1 from rental_units ru
    where ru.agency_id = '00000000-0000-0000-0000-000000000001'
      and ru.bien_id = b.id
      and ru.libelle = us.libelle
  )
  returning id
)
insert into locataires (agency_id, rental_unit_id, nom_complet, statut)
select
  '00000000-0000-0000-0000-000000000001',
  ru.id,
  us.locataire,
  'actif'
from unit_seed us
join biens b
  on b.agency_id = '00000000-0000-0000-0000-000000000001'
 and b.adresse = us.bien_adresse
join rental_units ru
  on ru.agency_id = '00000000-0000-0000-0000-000000000001'
 and ru.bien_id = b.id
 and ru.libelle = us.libelle
where not exists (
  select 1 from locataires l
  where l.agency_id = '00000000-0000-0000-0000-000000000001'
    and l.rental_unit_id = ru.id
    and l.nom_complet = us.locataire
);

insert into monthly_expected_rents (
  agency_id, locataire_id, rental_unit_id, mois_concerne, loyer_attendu, charges_attendues
)
select
  l.agency_id,
  l.id,
  ru.id,
  (date_trunc('month', now()) + (g.i || ' months')::interval)::date,
  ru.loyer_mensuel,
  ru.charges_mensuelles
from locataires l
join rental_units ru on ru.id = l.rental_unit_id and ru.agency_id = l.agency_id
cross join generate_series(-11, 0) as g(i)
where l.agency_id = '00000000-0000-0000-0000-000000000001'
on conflict (locataire_id, mois_concerne) do update set
  agency_id = excluded.agency_id,
  rental_unit_id = excluded.rental_unit_id,
  loyer_attendu = excluded.loyer_attendu,
  charges_attendues = excluded.charges_attendues;

notify pgrst, 'reload schema';
