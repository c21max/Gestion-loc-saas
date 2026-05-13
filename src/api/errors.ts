export function requireAgencyId(agencyId: string | null | undefined): string {
  if (!agencyId) throw new Error('Aucune agence active')
  return agencyId
}

export function throwIfError(error: unknown): void {
  if (error) throw error
}
