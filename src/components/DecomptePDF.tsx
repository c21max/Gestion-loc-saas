import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { OwnerStatement, Bien, Proprietaire, AgencySettings } from '@/types/database'
import { eur, moisFr, dateFr } from '@/lib/format'

const s = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#1a1a1a' },
  headerAgence: { backgroundColor: '#1e3a5f', color: 'white', padding: 16, marginBottom: 20, borderRadius: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: 'white' },
  headerSubtitle: { fontSize: 10, color: '#94b4d1', marginTop: 4 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontWeight: 'bold', backgroundColor: '#f1f5f9', padding: '6 8', marginBottom: 6, borderRadius: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  label: { color: '#6b7280' },
  value: { fontWeight: 'bold' },
  divider: { borderBottom: '1pt solid #e5e7eb', marginVertical: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderTop: '2pt solid #1e3a5f', marginTop: 8 },
  totalLabel: { fontSize: 12, fontWeight: 'bold' },
  totalValue: { fontSize: 12, fontWeight: 'bold', color: '#166534' },
})

interface Props {
  statement: OwnerStatement
  bien: Bien
  proprietaire: Proprietaire
  agencySettings?: AgencySettings
  mois: string
}

export function DecomptePDF({ statement: stmt, bien, proprietaire, agencySettings, mois }: Props) {
  const agencyName = agencySettings?.nom ?? 'Gestion Locative'

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* En-tête agence */}
        <View style={s.headerAgence}>
          <Text style={s.headerTitle}>{agencyName}</Text>
          <Text style={s.headerSubtitle}>Décompte propriétaire — {moisFr(mois)}</Text>
          {agencySettings?.email && <Text style={s.headerSubtitle}>{agencySettings.email}</Text>}
          {agencySettings?.telephone && <Text style={s.headerSubtitle}>{agencySettings.telephone}</Text>}
          {agencySettings?.numero_tva && <Text style={s.headerSubtitle}>TVA {agencySettings.numero_tva}</Text>}
        </View>

        {/* Bloc propriétaire */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Propriétaire</Text>
          <Text>{proprietaire.nom_complet}</Text>
          {proprietaire.adresse && <Text style={{ color: '#6b7280' }}>{proprietaire.adresse}</Text>}
          {proprietaire.code_postal && proprietaire.ville && (
            <Text style={{ color: '#6b7280' }}>{proprietaire.code_postal} {proprietaire.ville}</Text>
          )}
        </View>

        {/* Bloc bien */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Bien immobilier</Text>
          <Text>{bien.adresse}</Text>
          {bien.type_bien && <Text style={{ color: '#6b7280' }}>{bien.type_bien}</Text>}
          <Text style={{ color: '#6b7280', marginTop: 2 }}>Période : {moisFr(mois)}</Text>
        </View>

        {/* Paiements reçus */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Recettes du mois</Text>
          <View style={s.row}>
            <Text style={s.label}>Total perçu (loyers + charges)</Text>
            <Text style={s.value}>{eur(stmt.total_percu)}</Text>
          </View>
        </View>

        {/* Frais */}
        {stmt.total_frais_tvac > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Frais refacturables</Text>
            <View style={s.row}>
              <Text style={s.label}>Total frais (TVAC)</Text>
              <Text style={{ ...s.value, color: '#dc2626' }}>- {eur(stmt.total_frais_tvac)}</Text>
            </View>
          </View>
        )}

        {/* Honoraires */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Honoraires de gestion</Text>
          <View style={s.row}>
            <Text style={s.label}>Honoraires HTVA</Text>
            <Text>{eur(stmt.honoraires_htva)}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>TVA ({agencySettings?.taux_tva ?? 21}%)</Text>
            <Text>{eur(stmt.honoraires_tva)}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Total honoraires (TVAC)</Text>
            <Text style={{ ...s.value, color: '#dc2626' }}>- {eur(stmt.honoraires_tvac)}</Text>
          </View>
        </View>

        <View style={s.divider} />

        {/* Solde final */}
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>SOLDE À VIRER AU PROPRIÉTAIRE</Text>
          <Text style={{ ...s.totalLabel, color: stmt.solde_proprietaire >= 0 ? '#166534' : '#dc2626' }}>
            {eur(stmt.solde_proprietaire)}
          </Text>
        </View>

        {/* Footer */}
        <View style={{ marginTop: 40, borderTop: '1pt solid #e5e7eb', paddingTop: 8 }}>
          <Text style={{ color: '#9ca3af', fontSize: 8 }}>
            Document généré le {dateFr(stmt.genere_le ?? new Date().toISOString())} — {agencyName}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
