// Formatage monétaire et dates selon normes belges
export const eur = (val: number) =>
  new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(val)

export const dateFr = (iso: string | null | undefined) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('fr-BE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export const moisFr = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleDateString('fr-BE', { month: 'long', year: 'numeric' })
}

// Normalisation nom pour matching bancaire
export const normalizeName = (name: string): string =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\b(m\.|mr\.|mme\.|madame|monsieur|srl|sa|sprl)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

// Retourne YYYY-MM-01 pour un mois donné
export const firstOfMonth = (year: number, month: number): string => {
  const d = new Date(year, month - 1, 1)
  return d.toISOString().slice(0, 10)
}

// Retourne le mois courant sous forme YYYY-MM
export const currentMonthStr = (): string => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
