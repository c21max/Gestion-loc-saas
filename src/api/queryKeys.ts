import type { QueryClient } from '@tanstack/react-query'

export const queryKeys = {
  agencySettings: (agencyId: string | undefined) => ['agency-settings', agencyId] as const,
  bankImports: (agencyId: string | undefined) => ['bank-imports', agencyId] as const,
  payments: (agencyId: string | undefined, month?: string) =>
    month ? (['paiements', agencyId, month] as const) : (['paiements', agencyId] as const),
  reconciliation: (agencyId: string | undefined, month?: string) =>
    month ? (['reconciliation', agencyId, month] as const) : (['reconciliation', agencyId] as const),
  decomptesLiveData: (agencyId: string | undefined, month?: string) =>
    month ? (['decomptes-live-data', agencyId, month] as const) : (['decomptes-live-data', agencyId] as const),
  ownerStatements: (agencyId: string | undefined, month?: string) =>
    month ? (['owner-statements', agencyId, month] as const) : (['owner-statements', agencyId] as const),
  activeProperties: (agencyId: string | undefined) => ['biens-actifs', agencyId] as const,
}

export function invalidateAccountingData(queryClient: QueryClient, agencyId: string | undefined, month?: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.bankImports(agencyId) })
  queryClient.invalidateQueries({ queryKey: queryKeys.payments(agencyId, month) })
  queryClient.invalidateQueries({ queryKey: queryKeys.reconciliation(agencyId, month) })
  queryClient.invalidateQueries({ queryKey: queryKeys.decomptesLiveData(agencyId, month) })
  queryClient.invalidateQueries({ queryKey: queryKeys.ownerStatements(agencyId, month) })
}
