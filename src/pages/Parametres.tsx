import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { isDemoMode } from '@/lib/supabase'
import { DEMO_AGENCY_SETTINGS } from '@/lib/demo-data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { RefreshCw } from 'lucide-react'
import type { AgencySettings } from '@/types/database'
import { useAuth } from '@/lib/auth'
import { queryKeys } from '@/api/queryKeys'
import { getAgencySettings } from '@/api/decomptes.api'
import { generateExpectedRents, saveAgencySettings } from '@/api/settings.api'

export function Parametres() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const { agency } = useAuth()
  const agencyId = agency?.id
  const [form, setForm] = useState<Partial<AgencySettings>>({})

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.agencySettings(agencyId),
    enabled: isDemoMode || Boolean(agencyId),
    queryFn: async () => {
      if (isDemoMode) return DEMO_AGENCY_SETTINGS

      return getAgencySettings(agencyId)
    },
  })

  useEffect(() => { if (data) setForm(data) }, [data])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isDemoMode) {
        toast({ title: 'Mode démo', description: 'Connectez Supabase pour enregistrer les paramètres.' })
        return
      }
      await saveAgencySettings(agencyId, form)
    },
    onSuccess: () => {
      if (!isDemoMode) {
        toast({ title: 'Paramètres enregistrés' })
        qc.invalidateQueries({ queryKey: queryKeys.agencySettings(agencyId) })
      }
    },
    onError: (err: Error) => toast({ title: 'Erreur', description: err.message, variant: 'destructive' }),
  })

  const generateRentsMutation = useMutation({
    mutationFn: async () => {
      if (isDemoMode) {
        toast({ title: 'Mode démo', description: 'Connectez Supabase pour régénérer les loyers attendus.' })
        return
      }
      await generateExpectedRents(3)
    },
    onSuccess: () => {
      if (!isDemoMode) toast({ title: 'Loyers attendus régénérés', description: 'Mise à jour sur 12 mois passés + 3 mois futurs.' })
    },
    onError: (err: Error) => toast({ title: 'Erreur', description: err.message, variant: 'destructive' }),
  })

  if (isLoading) return <div className="animate-pulse text-muted-foreground">Chargement…</div>

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Paramètres</h1>

      <Card>
        <CardHeader><CardTitle className="text-base">Informations agence</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <Label>Nom de l'agence *</Label>
              <Input value={form.nom ?? ''} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={form.email ?? ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Téléphone</Label>
              <Input value={form.telephone ?? ''} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Adresse</Label>
              <Input value={form.adresse ?? ''} onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Code postal</Label>
              <Input value={form.code_postal ?? ''} onChange={e => setForm(f => ({ ...f, code_postal: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Ville</Label>
              <Input value={form.ville ?? ''} onChange={e => setForm(f => ({ ...f, ville: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>N° TVA agence</Label>
              <Input value={form.numero_tva ?? ''} onChange={e => setForm(f => ({ ...f, numero_tva: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Pays</Label>
              <Input value={form.pays ?? 'BE'} onChange={e => setForm(f => ({ ...f, pays: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Devise</Label>
              <Input value={form.devise ?? 'EUR'} onChange={e => setForm(f => ({ ...f, devise: e.target.value }))} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Logo</Label>
              <Input value={form.logo_url ?? ''} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} placeholder="URL du logo" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            <div className="space-y-1">
              <Label>% honoraires par défaut</Label>
              <Input
                type="number"
                step="0.1"
                value={form.pourcentage_honoraires ?? 7}
                onChange={e => setForm(f => ({ ...f, pourcentage_honoraires: parseFloat(e.target.value) }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Taux TVA par défaut (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={form.taux_tva ?? 21}
                onChange={e => setForm(f => ({ ...f, taux_tva: parseFloat(e.target.value) }))}
              />
            </div>
          </div>

          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Enregistrement…' : isDemoMode ? 'Enregistrer (démo)' : 'Enregistrer'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Maintenance</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm font-medium">Régénérer les loyers attendus</p>
            <p className="text-xs text-muted-foreground mb-2">
              Recalcule les monthly_expected_rents pour tous les locataires actifs (12 mois passés + 3 mois futurs).
            </p>
            <Button
              variant="outline"
              onClick={() => generateRentsMutation.mutate()}
              disabled={generateRentsMutation.isPending}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${generateRentsMutation.isPending ? 'animate-spin' : ''}`} />
              {isDemoMode ? 'Régénérer (démo)' : 'Régénérer'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
