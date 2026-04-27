# PROJET — Application web de gestion locative (agence immobilière)

Tu vas construire from scratch une application web de gestion locative pour une petite agence immobilière belge. La version précédente a souffert de confusion entre biens / unités / locataires et d'un module d'import bancaire incomplet. L'objectif ici est une architecture **propre, normalisée et robuste**, avec un workflow mensuel simple en 4 étapes.

## 1. Description fonctionnelle

L'application gère :
- propriétaires (personne physique, société, indivision)
- biens immobiliers
- unités locatives (un bien peut en contenir 1 ou plusieurs)
- locataires (rattachés à une unité)
- loyers et charges mensuels attendus
- paiements reçus (avec date bancaire ≠ période concernée)
- frais divers (refacturables ou non)
- honoraires de gestion (configurables par bien/unité)
- décomptes propriétaires mensuels (PDF)
- import d'extraits bancaires PDF (Crelan, BNP, etc.)
- réconciliation bancaire mensuelle
- détection des impayés et arriérés

Workflow mensuel cible (4 étapes) :
1. Importer les extraits bancaires PDF du mois
2. Réconcilier (qui a payé, qui n'a pas payé, partiels, arriérés)
3. Encoder/valider les frais divers
4. Générer les décomptes propriétaires PDF

## 2. Stack technique

- Frontend : **React 18 + Vite + TypeScript + TailwindCSS + shadcn/ui**
- Routing : `react-router-dom` v6
- State serveur : `@tanstack/react-query`
- Backend : **Supabase** (Postgres + Auth + Storage + Edge Functions Deno)
- Auth : Supabase Auth (email/password, pas d'anonymous)
- Parsing PDF : `pdfjs-dist` côté edge function
- Fallback IA parsing : Gemini Flash via gateway OpenAI-compatible
- Génération PDF décomptes : `@react-pdf/renderer`
- Stockage PDF importés : bucket Supabase `bank-statements` (privé)
- Format monétaire : `Intl.NumberFormat("fr-BE", { currency: "EUR" })`
- Locale dates : `fr-BE`

## 3. Schéma de base de données

Toutes les tables ont `id uuid pk default gen_random_uuid()`, `created_at`, `updated_at` avec trigger `set_updated_at()`. RLS activée ; policy `authenticated USING (true) WITH CHECK (true)` pour la V1 mono-agence.

```sql
create type proprietaire_type as enum ('personne_physique','societe','indivision');
create type bien_statut as enum ('actif','inactif','vendu');
create type locataire_statut as enum ('actif','sorti','prospect');
create type base_calcul_honoraires as enum ('loyer_seul','loyer_plus_charges');
create type paiement_statut as enum ('paye','partiel','impaye','en_attente');
create type bank_import_status as enum ('en_cours','traite','erreur');
create type bank_parse_method as enum ('text','ai','manual');
create type bank_movement_status as enum ('a_valider','apparie','ignore','paiement_cree','doublon');
create type bank_movement_category as enum ('loyer','charges','frais','autre');

create table agency_settings (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  adresse text, code_postal text, ville text,
  telephone text, email text, numero_tva text,
  pourcentage_honoraires numeric not null default 7,
  taux_tva numeric not null default 21,
  updated_at timestamptz not null default now()
);

create table proprietaires (
  id uuid primary key default gen_random_uuid(),
  nom_complet text not null,
  type_proprietaire proprietaire_type not null default 'personne_physique',
  adresse text, code_postal text, ville text, pays text,
  email text, telephone text, numero_tva text, notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

-- IMPORTANT : un bien a TOUJOURS au moins une unité (créée auto si mono-unité).
-- Loyers/charges/honoraires vivent sur l'unité, JAMAIS sur le bien.
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

create table monthly_expected_rents (
  id uuid primary key default gen_random_uuid(),
  locataire_id uuid not null references locataires(id) on delete cascade,
  rental_unit_id uuid not null references rental_units(id) on delete cascade,
  mois_concerne date not null,
  loyer_attendu numeric(10,2) not null,
  charges_attendues numeric(10,2) not null,
  unique (locataire_id, mois_concerne)
);

create table paiements (
  id uuid primary key default gen_random_uuid(),
  locataire_id uuid not null references locataires(id) on delete restrict,
  rental_unit_id uuid not null references rental_units(id) on delete restrict,
  bien_id uuid not null references biens(id) on delete restrict,
  mois_concerne date not null,        -- période imputée
  date_paiement date,                 -- date bancaire réelle
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
```

## 4. Règles métier

- Propriétaire → N biens. Bien → 1..N unités. Locataire → 1 unité. Une unité peut héberger plusieurs locataires successifs.
- Les loyers/charges par défaut viennent de l'unité ; un locataire peut les surcharger via `*_override`.
- Honoraires : `pct × base`, base = loyer seul OU loyer+charges selon `base_calcul_honoraires` ; TVA 21 % par défaut.
- **Un paiement a 2 dates** : `date_paiement` (bancaire) ET `mois_concerne` (période). Un virement reçu le 12/03 peut concerner octobre N-1.
- **Détection impayés** : pour chaque (locataire, mois), comparer `monthly_expected_rents` aux `paiements`.
  - `paye_confirme` : total_percu ≥ attendu
  - `paiement_probable` : movement matché score ≥ 90, montant exact
  - `partiel` : 0 < total_percu < attendu
  - `impaye` : aucun paiement
  - `doublon` : 2 mouvements identiques (même hash)
- Aucun paiement trouvé pour (locataire, période) → "Impayé". Un paiement sur ancienne période ne compte JAMAIS pour le mois courant.
- Suppression d'un import = cascade sur movements + paiements créés + fichier storage.

## 5. Algorithme d'import & matching

Edge function `parse-bank-statement` :
1. Télécharger le PDF depuis le bucket.
2. Extraire le texte avec `pdfjs-dist`.
3. Heuristique `estimateMovementCount` : compter `+ X,XX EUR` / `- X,XX EUR` dans le texte brut.
4. Parser ligne à ligne (regex Crelan : date, montant signé, libellé multiligne, IBAN BE..).
5. Si `parsés < 0.8 × estimation` → fallback **Gemini Flash** : envoyer texte brut + schéma JSON, récupérer mouvements.
6. Insérer dans `bank_movements` avec `dedupe_hash = sha256(operation_date|amount|iban|comm)`.
7. Pour chaque mouvement entrant : `scoreLocataires()`.

`scoreLocataires(movement, locataires_actifs, aliases)` retourne `{ locataire_id, bien_id, score }` :
- +60 pts si IBAN exact présent dans `payment_aliases`
- +50 pts si nom normalisé (sans accents/titres, lowercase) match un alias
- +30 pts similarité Levenshtein nom donneur ↔ nom locataire (≥ 0.7)
- +20 pts si la communication contient mots-clés adresse du bien
- +40 pts si `amount` ∈ [attendu - 0.5 ; attendu + 0.5]
- +10 pts si mois courant non encore payé
- **Auto-création paiement** UNIQUEMENT si `score ≥ 90 ET |amount - attendu| ≤ 0.5`. Sinon → `a_valider`.

## 6. Interface utilisateur

Routes :
- `/` Dashboard (KPIs : loyers attendus, perçus, taux, impayés, derniers imports)
- `/portefeuille` toggle [Par bien | Par propriétaire] + recherche
- `/proprietaires`, `/proprietaires/:id`
- `/biens`, `/biens/:id` (unités, locataires, paiements, frais, décomptes)
- `/locataires`
- `/paiements`, `/frais`
- `/import-bancaire`
- `/reconciliation?mois=YYYY-MM` ⭐ vue centrale
- `/decomptes`
- `/parametres`, `/auth`

Layout : sidebar shadcn collapsible, header recherche globale, max-width 1400px.

Page **Réconciliation** :
- Sélecteur mois **hybride** (input month + auto-rempli depuis dernier import)
- KPIs : Total attendu / Reçu / Reste dû / # payés / # impayés
- Tableau de TOUS les loyers attendus du mois : Locataire · Bien · Attendu · Reçu · Solde · Statut (badge) · Mouvement lié · Actions
- Section "Mouvements non reconnus" : sélecteur locataire + sélecteur mois + checkbox "Mémoriser cette correspondance" → écrit dans `payment_aliases` + crée paiement proratisé.

## 7. Décompte propriétaire (PDF)

Pour (bien, mois) :
- Somme paiements → loyer, charges, indemnites, degats, garantie, total_percu
- Somme `frais_divers` refacturables (HTVA, TVA, TVAC) du mois
- Honoraires : `base = (base_calcul='loyer_seul') ? loyer : loyer+charges` ; `htva = base × pct/100` ; `tvac = htva × 1.21`
- **Solde propriétaire = total_percu − frais_tvac − honoraires_tvac**

PDF : en-tête agence, bloc propriétaire, bloc bien, période, tableau locataires/paiements, tableau frais, bloc honoraires, ligne solde finale en gras.

## 8. Données seed initiales

Crée `seed.ts` qui insère ces données réelles :

**Agence** : nom à demander au premier lancement, defaults pct=7, tva=21.

**Propriétaires & biens & unités & locataires** :

| Propriétaire | Bien | Type | Loyer | Charges | % hon. | Base | Locataire |
|---|---|---|---|---|---|---|---|
| Adrien Vanderborght et Laurence Gilon | Rue Paul Tournay, 14/5 - 5030 Gembloux | Appartement | 915 | 125 | 8 | loyer+charges | Moreno - Coconi |
| Madame Francesca TRISCIUOGLIO | Place de l'Équerre, 61/201 - 1348 LLN | Appartement | 660 | 55 | 7 | loyer+charges | Camille MESSAGER |
| Madame Valentina TRISCIUOGLIO | Place de l'Équerre, 61/203 - 1348 LLN | Appartement | 675 | 65 | 7 | loyer+charges | Matteo Hollingworth |
| Monsieur Aldo TRISCIUOGLIO | Place de l'Équerre, 61/101 - 1348 LLN | Appartement | 585 | 35 | 7 | loyer+charges | Maxence Simon |
| Madame PAQUAY Marie-Louise | Rue Marcel Thiry, 1/303 - 1348 LLN | Appartement | 815 | 85 | 10 | loyer_seul | De Longree - Defraigne |
| Madame Véronique EECKHOUDT | Rue Marcel Thiry, 3 - 1348 LLN | Appartement | 1030 | 120 | 8 | loyer+charges | Léa De Carrelo Soares |
| Monsieur Christophe BELLON | Avenue Maurice Maeterlinck, 3M/201 - 1348 LLN | Appartement | 900 | 100 | 8 | loyer+charges | RAVEL-REBAUDO |
| SRL Belgique sous-traitance | Chaussée Romaine, 115/12 - 5030 Gembloux | Bien locatif | 1050 | 180 | 10 | loyer_seul | Posteau-De Lannoy |
| (proprio Jemeppe) | Rue de Jemeppe, 19 - 5190 Jemeppe-sur-Sambre | — | 950 | 130 | 10 | loyer_seul | EZBAT SRL |

**⭐ CAS RENSON Philippe** (adresse propriétaire : Chaussée de Tirlemont, 117 - 5030 Gembloux) — créer **3 BIENS DISTINCTS**, JAMAIS un seul bien fusionné :

1. Bien `Chaussée de Tirlemont, 119 - 5030 Gembloux`, type `Maison`, % hon = 10, base = `loyer_seul`
   → 1 unité, loyer 1150, charges 0
   → locataire **MIRGUET**

2. Bien `Chaussée de Tirlemont, 177 - 5030 Gembloux`, type `Maison`, % hon = 10, base = `loyer_seul`
   → 1 unité, loyer 865, charges 0
   → locataire **MELOTTE**

3. Bien `Rue des Champs, 11 - 5030 Gembloux`, type `Immeuble multi-occupants`, % hon = 10, base = `loyer_seul`
   → **3 unités locatives distinctes** :
     - Unité "Pierre" : loyer 550, charges 50 → locataire **Pierre**
     - Unité "Bonnet" : loyer 670, charges 45 → locataire **Bonnet**
     - Unité "Nina" : loyer 0, charges 0 (modifiable) → locataire **Nina**
   → ce bien doit gérer impayés, paiements partiels, et paiements imputés à un autre `mois_concerne` que la `date_paiement`.

Génère ensuite `monthly_expected_rents` pour les 12 mois glissants pour chaque locataire actif.

## 9. Livrables attendus

1. Initialiser Vite + React + TS + Tailwind + shadcn.
2. Configurer Supabase local (`supabase init`) + migrations.
3. Générer client typé (`supabase gen types typescript`).
4. Auth (login/signup email+password, route guard).
5. Layout + sidebar + toutes les pages section 6.
6. `src/lib/decompte.ts` (sumPaiements, sumFrais, calcHonoraires, calcSolde, calcDecompte).
7. Edge function `parse-bank-statement` (texte + fallback Gemini).
8. Page Réconciliation complète.
9. Génération PDF décompte (`@react-pdf/renderer`).
10. RPC `generate_expected_rents(months_ahead int)`.
11. Suppression cascade d'un import.
12. Script `seed.ts` avec les données ci-dessus.
13. README : `npm i`, `supabase start`, `supabase db reset`, `npm run dev`, secrets (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GEMINI_API_KEY`).
14. Tests Vitest sur `lib/decompte.ts` et `scoreLocataires`.

## 10. Contraintes de qualité

- TypeScript strict, types Supabase générés (jamais `any` sur rows DB).
- Aucun mélange bien ↔ unité ↔ locataire : toujours via `rental_unit_id`.
- Ne jamais masquer un locataire impayé.
- Toujours afficher tous les loyers attendus, même sans paiement.
- Ne jamais auto-créer un paiement si score < 90 ou montant non exact.
- Apprentissage via `payment_aliases` = boost de score uniquement, jamais 100 % auto sur le seul nom.
- Format monétaire FR-BE, dates jj/mm/aaaa.
- Code commenté en français pour la logique métier.

Commence par : (1) `package.json` + Vite, (2) migrations SQL, (3) types générés, (4) seed, (5) auth + layout, (6) Portefeuille, (7) Réconciliation, (8) Décomptes, (9) Import bancaire. Livre étape par étape, en confirmant à chaque étape que ça compile et tourne.
