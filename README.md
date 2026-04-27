# Gestion Locative — Application web agence immobilière belge

## Stack

- **Frontend** : React 18 + Vite + TypeScript + TailwindCSS + shadcn/ui
- **Backend** : Supabase (Postgres + Auth + Storage + Edge Functions Deno)
- **PDF génération** : @react-pdf/renderer
- **PDF parsing** : extraction texte + fallback Gemini Flash

## Démarrage rapide

### 1. Installer les dépendances

```bash
npm install
```

### 2. Configurer les variables d'environnement

```bash
cp .env.example .env.local
```

Éditer `.env.local` :
```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<votre-clé-anon-locale>
```

### 3. Démarrer Supabase localement

```bash
supabase start
```

### 4. Appliquer les migrations et le seed

```bash
supabase db reset
npx tsx supabase/seed/seed.ts
```

### 5. Lancer le serveur de développement

```bash
npm run dev
```

Ouvrir http://localhost:5173

---

## Variables d'environnement (Edge Functions)

À configurer dans Supabase Dashboard > Settings > Edge Functions :

| Variable | Description |
|---|---|
| `SUPABASE_URL` | URL Supabase (auto-injecté) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service (auto-injecté) |
| `GEMINI_API_KEY` | Clé API Gemini Flash (fallback parsing PDF) |

## Scripts disponibles

```bash
npm run dev          # Serveur de développement
npm run build        # Build production
npm run test         # Tests Vitest
npm run supabase:types  # Régénérer les types TypeScript depuis le schéma DB
```

## Architecture

```
src/
  lib/
    supabase.ts      # Client Supabase
    decompte.ts      # Logique métier décomptes propriétaires
    scoring.ts       # Algorithme matching mouvement ↔ locataire
    format.ts        # Formatage EUR, dates fr-BE
  types/
    database.ts      # Types TypeScript du schéma DB
  components/
    ui/              # Composants shadcn/ui
    layout/          # Sidebar, AppLayout, ProtectedRoute
    DecomptePDF.tsx  # Template PDF @react-pdf/renderer
  pages/
    Dashboard.tsx    # KPIs + workflow mensuel
    Portefeuille.tsx # Vue par bien / par propriétaire
    Proprietaires.tsx
    Locataires.tsx
    Paiements.tsx
    Frais.tsx        # Frais divers
    ImportBancaire.tsx
    Reconciliation.tsx  # ⭐ Vue centrale
    Decomptes.tsx    # Génération PDF décomptes
    Parametres.tsx

supabase/
  migrations/
    20240001_init.sql   # Schéma complet
    20240002_rpc.sql    # Fonctions generate_expected_rents, delete_bank_import
  functions/
    parse-bank-statement/
      index.ts       # Edge function parsing PDF (Crelan + fallback Gemini)
  seed/
    seed.ts          # Données réelles de l'agence
```

## Workflow mensuel (4 étapes)

1. **Importer** les extraits bancaires PDF (Crelan, BNP)
2. **Réconcilier** sur `/reconciliation?mois=YYYY-MM` — vue centrale
3. **Encoder** les frais divers sur `/frais`
4. **Générer** les décomptes PDF sur `/decomptes`

## Règles métier importantes

- Un **paiement a 2 dates** : `date_paiement` (bancaire) et `mois_concerne` (période imputée)
- **Auto-création paiement** uniquement si score matching ≥ 90 ET |montant - attendu| ≤ 0.50 €
- Les loyers/charges vivent sur l'**unité locative** (`rental_units`), jamais sur le bien
- Un locataire impayé est toujours visible dans la réconciliation
