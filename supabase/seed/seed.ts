// Script seed — données réelles agence immobilière belge
// Lancer avec : npx tsx supabase/seed/seed.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321',
  process.env.SUPABASE_SERVICE_KEY ?? ''
)

async function main() {
  console.log('🌱 Démarrage du seed...')

  // Paramètres agence
  await supabase.from('agency_settings').upsert({
    nom: 'Mon Agence Immobilière',
    ville: 'Gembloux',
    pays: 'Belgique',
    pourcentage_honoraires: 7,
    taux_tva: 21,
  })

  // ─── Propriétaires ───────────────────────────────────────────────
  const proprietaires = [
    { nom_complet: 'Adrien Vanderborght et Laurence Gilon', type_proprietaire: 'indivision' as const },
    { nom_complet: 'Madame Francesca TRISCIUOGLIO', type_proprietaire: 'personne_physique' as const },
    { nom_complet: 'Madame Valentina TRISCIUOGLIO', type_proprietaire: 'personne_physique' as const },
    { nom_complet: 'Monsieur Aldo TRISCIUOGLIO', type_proprietaire: 'personne_physique' as const },
    { nom_complet: 'Madame PAQUAY Marie-Louise', type_proprietaire: 'personne_physique' as const },
    { nom_complet: 'Madame Véronique EECKHOUDT', type_proprietaire: 'personne_physique' as const },
    { nom_complet: 'Monsieur Christophe BELLON', type_proprietaire: 'personne_physique' as const },
    { nom_complet: 'SRL Belgique sous-traitance', type_proprietaire: 'societe' as const },
    { nom_complet: '(proprio Jemeppe)', type_proprietaire: 'personne_physique' as const },
    {
      nom_complet: 'RENSON Philippe',
      type_proprietaire: 'personne_physique' as const,
      adresse: 'Chaussée de Tirlemont, 117',
      code_postal: '5030',
      ville: 'Gembloux',
    },
  ]

  const { data: props, error: propError } = await supabase
    .from('proprietaires')
    .insert(proprietaires)
    .select()

  if (propError) throw propError
  console.log(`✅ ${props.length} propriétaires insérés`)

  const byNom = (nom: string) => props.find(p => p.nom_complet === nom)!

  // ─── Biens + unités + locataires ────────────────────────────────
  type BienSeed = {
    proprio: string
    adresse: string
    type_bien: string
    unites: {
      libelle: string
      loyer: number
      charges: number
      pct_hon: number
      base: 'loyer_seul' | 'loyer_plus_charges'
      locataire: string
    }[]
  }

  const biensData: BienSeed[] = [
    {
      proprio: 'Adrien Vanderborght et Laurence Gilon',
      adresse: 'Rue Paul Tournay, 14/5 - 5030 Gembloux',
      type_bien: 'Appartement',
      unites: [{ libelle: 'Appartement', loyer: 915, charges: 125, pct_hon: 8, base: 'loyer_plus_charges', locataire: 'Moreno - Coconi' }],
    },
    {
      proprio: 'Madame Francesca TRISCIUOGLIO',
      adresse: "Place de l'Équerre, 61/201 - 1348 LLN",
      type_bien: 'Appartement',
      unites: [{ libelle: 'Appartement 201', loyer: 660, charges: 55, pct_hon: 7, base: 'loyer_plus_charges', locataire: 'Camille MESSAGER' }],
    },
    {
      proprio: 'Madame Valentina TRISCIUOGLIO',
      adresse: "Place de l'Équerre, 61/203 - 1348 LLN",
      type_bien: 'Appartement',
      unites: [{ libelle: 'Appartement 203', loyer: 675, charges: 65, pct_hon: 7, base: 'loyer_plus_charges', locataire: 'Matteo Hollingworth' }],
    },
    {
      proprio: 'Monsieur Aldo TRISCIUOGLIO',
      adresse: "Place de l'Équerre, 61/101 - 1348 LLN",
      type_bien: 'Appartement',
      unites: [{ libelle: 'Appartement 101', loyer: 585, charges: 35, pct_hon: 7, base: 'loyer_plus_charges', locataire: 'Maxence Simon' }],
    },
    {
      proprio: 'Madame PAQUAY Marie-Louise',
      adresse: 'Rue Marcel Thiry, 1/303 - 1348 LLN',
      type_bien: 'Appartement',
      unites: [{ libelle: 'Appartement 303', loyer: 815, charges: 85, pct_hon: 10, base: 'loyer_seul', locataire: 'De Longree - Defraigne' }],
    },
    {
      proprio: 'Madame Véronique EECKHOUDT',
      adresse: 'Rue Marcel Thiry, 3 - 1348 LLN',
      type_bien: 'Appartement',
      unites: [{ libelle: 'Appartement', loyer: 1030, charges: 120, pct_hon: 8, base: 'loyer_plus_charges', locataire: 'Léa De Carrelo Soares' }],
    },
    {
      proprio: 'Monsieur Christophe BELLON',
      adresse: 'Avenue Maurice Maeterlinck, 3M/201 - 1348 LLN',
      type_bien: 'Appartement',
      unites: [{ libelle: 'Appartement 201', loyer: 900, charges: 100, pct_hon: 8, base: 'loyer_plus_charges', locataire: 'RAVEL-REBAUDO' }],
    },
    {
      proprio: 'SRL Belgique sous-traitance',
      adresse: 'Chaussée Romaine, 115/12 - 5030 Gembloux',
      type_bien: 'Bien locatif',
      unites: [{ libelle: 'Unité principale', loyer: 1050, charges: 180, pct_hon: 10, base: 'loyer_seul', locataire: 'Posteau-De Lannoy' }],
    },
    {
      proprio: '(proprio Jemeppe)',
      adresse: 'Rue de Jemeppe, 19 - 5190 Jemeppe-sur-Sambre',
      type_bien: 'Bien locatif',
      unites: [{ libelle: 'Unité principale', loyer: 950, charges: 130, pct_hon: 10, base: 'loyer_seul', locataire: 'EZBAT SRL' }],
    },
    // RENSON — bien 1
    {
      proprio: 'RENSON Philippe',
      adresse: 'Chaussée de Tirlemont, 119 - 5030 Gembloux',
      type_bien: 'Maison',
      unites: [{ libelle: 'Maison', loyer: 1150, charges: 0, pct_hon: 10, base: 'loyer_seul', locataire: 'MIRGUET' }],
    },
    // RENSON — bien 2
    {
      proprio: 'RENSON Philippe',
      adresse: 'Chaussée de Tirlemont, 177 - 5030 Gembloux',
      type_bien: 'Maison',
      unites: [{ libelle: 'Maison', loyer: 865, charges: 0, pct_hon: 10, base: 'loyer_seul', locataire: 'MELOTTE' }],
    },
    // RENSON — bien 3 (immeuble multi-occupants avec 3 unités)
    {
      proprio: 'RENSON Philippe',
      adresse: 'Rue des Champs, 11 - 5030 Gembloux',
      type_bien: 'Immeuble multi-occupants',
      unites: [
        { libelle: 'Pierre', loyer: 550, charges: 50, pct_hon: 10, base: 'loyer_seul', locataire: 'Pierre' },
        { libelle: 'Bonnet', loyer: 670, charges: 45, pct_hon: 10, base: 'loyer_seul', locataire: 'Bonnet' },
        { libelle: 'Nina', loyer: 0, charges: 0, pct_hon: 10, base: 'loyer_seul', locataire: 'Nina' },
      ],
    },
  ]

  for (const b of biensData) {
    const proprio = byNom(b.proprio)

    const { data: bien, error: bErr } = await supabase
      .from('biens')
      .insert({ proprietaire_id: proprio.id, adresse: b.adresse, type_bien: b.type_bien, statut: 'actif' })
      .select()
      .single()
    if (bErr) throw bErr

    for (const u of b.unites) {
      const { data: unit, error: uErr } = await supabase
        .from('rental_units')
        .insert({
          bien_id: bien.id,
          libelle: u.libelle,
          loyer_mensuel: u.loyer,
          charges_mensuelles: u.charges,
          pourcentage_honoraires: u.pct_hon,
          taux_tva_honoraires: 21,
          base_calcul_honoraires: u.base,
          actif: true,
        })
        .select()
        .single()
      if (uErr) throw uErr

      const { data: loc, error: lErr } = await supabase
        .from('locataires')
        .insert({
          rental_unit_id: unit.id,
          nom_complet: u.locataire,
          statut: 'actif',
        })
        .select()
        .single()
      if (lErr) throw lErr

      // Générer les loyers attendus pour les 12 mois glissants
      const today = new Date()
      const rows = []
      for (let i = -11; i <= 0; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() + i, 1)
        const mois = d.toISOString().slice(0, 10)
        rows.push({
          locataire_id: loc.id,
          rental_unit_id: unit.id,
          mois_concerne: mois,
          loyer_attendu: u.loyer,
          charges_attendues: u.charges,
        })
      }

      const { error: merErr } = await supabase
        .from('monthly_expected_rents')
        .upsert(rows, { onConflict: 'locataire_id,mois_concerne' })
      if (merErr) throw merErr

      console.log(`  ✅ ${b.adresse} / ${u.libelle} → ${u.locataire}`)
    }
  }

  console.log('🎉 Seed terminé avec succès !')
}

main().catch(e => { console.error('❌ Erreur seed:', e); process.exit(1) })
