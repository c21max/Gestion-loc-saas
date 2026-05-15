import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { AgencySettings, Bien, OwnerStatement, Proprietaire } from '@/types/database'
import { dateFr, eur, moisFr } from '@/lib/format'

const s = StyleSheet.create({
  page: {
    paddingTop: 34,
    paddingHorizontal: 38,
    paddingBottom: 28,
    fontFamily: 'Helvetica',
    fontSize: 9.5,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  topBar: {
    height: 4,
    backgroundColor: '#1f4e99',
    marginHorizontal: -38,
    marginTop: -34,
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  logo: {
    width: 58,
    height: 58,
    objectFit: 'contain',
  },
  brandName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f4e99',
  },
  brandMeta: {
    marginTop: 2,
    color: '#4b5563',
    lineHeight: 1.35,
  },
  docMeta: {
    minWidth: 170,
    alignItems: 'flex-end',
  },
  docTitle: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  periodPill: {
    marginTop: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: '#eff6ff',
    color: '#1d4ed8',
    borderRadius: 3,
    fontWeight: 'bold',
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  infoCard: {
    flex: 1,
    border: '1pt solid #d1d5db',
    borderRadius: 4,
    padding: 12,
    minHeight: 76,
  },
  infoLabel: {
    fontSize: 8,
    textTransform: 'uppercase',
    color: '#6b7280',
    marginBottom: 6,
  },
  infoMain: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  muted: {
    color: '#4b5563',
    lineHeight: 1.35,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#374151',
    marginBottom: 8,
  },
  table: {
    border: '1pt solid #d1d5db',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 18,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottom: '1pt solid #d1d5db',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1pt solid #e5e7eb',
  },
  tableRowLast: {
    flexDirection: 'row',
  },
  cellLabel: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  cellValue: {
    width: 108,
    paddingVertical: 8,
    paddingHorizontal: 10,
    textAlign: 'right',
  },
  headerCell: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#4b5563',
  },
  negative: {
    color: '#b91c1c',
    fontWeight: 'bold',
  },
  positive: {
    color: '#166534',
    fontWeight: 'bold',
  },
  summary: {
    border: '1pt solid #1f4e99',
    borderRadius: 4,
    padding: 14,
    backgroundColor: '#f8fbff',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 24,
    paddingTop: 9,
    borderTop: '1pt solid #e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    color: '#6b7280',
    fontSize: 8,
  },
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
  const showDefaultImmoTassoulLogo = agencyName.toLowerCase().includes('immo tassoul')
  const logoSrc = agencySettings?.logo_url ?? (showDefaultImmoTassoulLogo ? '/immo-tassoul-logo.png' : null)
  const locationLine = [agencySettings?.code_postal, agencySettings?.ville].filter(Boolean).join(' ')
  const ownerLocationLine = [proprietaire.code_postal, proprietaire.ville].filter(Boolean).join(' ')

  const rows = [
    { label: 'Total perçu', value: stmt.total_percu, tone: 'positive' as const },
    { label: 'Frais refacturables', value: stmt.total_frais_tvac, tone: 'negative' as const },
    { label: 'Honoraires HTVA', value: stmt.honoraires_htva, tone: 'neutral' as const },
    { label: `TVA honoraires (${agencySettings?.taux_tva ?? 21}%)`, value: stmt.honoraires_tva, tone: 'neutral' as const },
    { label: 'Honoraires TVAC', value: stmt.honoraires_tvac, tone: 'negative' as const },
  ]

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.topBar} />

        <View style={s.header}>
          <View style={s.brandWrap}>
            {logoSrc && <Image src={logoSrc} style={s.logo} />}
            <View>
              <Text style={s.brandName}>{agencyName}</Text>
              {agencySettings?.adresse && <Text style={s.brandMeta}>{agencySettings.adresse}</Text>}
              {locationLine && <Text style={s.brandMeta}>{locationLine}</Text>}
              {agencySettings?.telephone && <Text style={s.brandMeta}>{agencySettings.telephone}</Text>}
              {agencySettings?.email && <Text style={s.brandMeta}>{agencySettings.email}</Text>}
              {agencySettings?.numero_tva && <Text style={s.brandMeta}>TVA {agencySettings.numero_tva}</Text>}
            </View>
          </View>

          <View style={s.docMeta}>
            <Text style={s.docTitle}>Décompte propriétaire</Text>
            <Text style={s.periodPill}>{moisFr(mois)}</Text>
          </View>
        </View>

        <View style={s.infoGrid}>
          <View style={s.infoCard}>
            <Text style={s.infoLabel}>Propriétaire</Text>
            <Text style={s.infoMain}>{proprietaire.nom_complet}</Text>
            {proprietaire.adresse && <Text style={s.muted}>{proprietaire.adresse}</Text>}
            {ownerLocationLine && <Text style={s.muted}>{ownerLocationLine}</Text>}
          </View>

          <View style={s.infoCard}>
            <Text style={s.infoLabel}>Bien immobilier</Text>
            <Text style={s.infoMain}>{bien.adresse}</Text>
            {bien.type_bien && <Text style={s.muted}>{bien.type_bien}</Text>}
          </View>
        </View>

        <Text style={s.sectionTitle}>Synthèse du décompte</Text>
        <View style={s.table}>
          <View style={s.tableHeader}>
            <Text style={[s.cellLabel, s.headerCell]}>Poste</Text>
            <Text style={[s.cellValue, s.headerCell]}>Montant</Text>
          </View>
          {rows.map((row, index) => (
            <View key={row.label} style={index === rows.length - 1 ? s.tableRowLast : s.tableRow}>
              <Text style={s.cellLabel}>{row.label}</Text>
              <Text
                style={[
                  s.cellValue,
                  row.tone === 'negative' ? s.negative : row.tone === 'positive' ? s.positive : {},
                ]}
              >
                {row.tone === 'negative' && row.value > 0 ? '- ' : ''}
                {eur(row.value)}
              </Text>
            </View>
          ))}
        </View>

        <View style={s.summary}>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Solde à virer au propriétaire</Text>
            <Text style={[s.summaryValue, stmt.solde_proprietaire >= 0 ? s.positive : s.negative]}>
              {eur(stmt.solde_proprietaire)}
            </Text>
          </View>
        </View>

        <View style={s.footer}>
          <Text>Document généré le {dateFr(stmt.genere_le ?? new Date().toISOString())}</Text>
          <Text>{agencyName}</Text>
        </View>
      </Page>
    </Document>
  )
}
