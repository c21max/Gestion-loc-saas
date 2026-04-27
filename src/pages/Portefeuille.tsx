import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, isDemoMode } from '@/lib/supabase'
import { DEMO_PORTEFEUILLE } from '@/lib/demo-data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { currentMonthStr, eur } from '@/lib/format'
import { Building2, CreditCard, Receipt, Search, ChevronRight, Plus, Users } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import type { Proprietaire, Bien, RentalUnit, Locataire, Paiement } from '@/types/database'
import { useAuth } from '@/lib/auth'
import { useToast } from '@/hooks/use-toast'
import { EmptyState, PageHeader, SkeletonBlock } from '@/components/ui/page'

type ViewMode = 'par_bien' | 'par_proprietaire'

type PortefeuilleData = Proprietaire & {
  biens: (Bien & {
    rental_units: (RentalUnit & { locataires: Locataire[] })[]
  })[]
}

export function Portefeuille() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const { agency } = useAuth()
  const agencyId = agency?.id
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState<ViewMode>('par_bien')
  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const moisIso = `${currentMonthStr()}-01`
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    proprietaire_id: '',
    adresse: '',
    type_bien: '',
    reference_interne: '',
    unit_libelle: 'Logement principal',
    loyer_mensuel: '',
    charges_mensuelles: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['portefeuille', agencyId],
    enabled: isDemoMode || Boolean(agencyId),
    queryFn: async () => {
      if (isDemoMode) return DEMO_PORTEFEUILLE as PortefeuilleData[]

      const { data, error } = await supabase
        .from('proprietaires')
        .select(`
          *,
          biens (
            *,
            rental_units (
              *,
              locataires (*)
            )
          )
        `)
        .eq('agency_id', agencyId)
        .order('nom_complet')
      if (error) throw error
      return (data ?? []) as PortefeuilleData[]
    },
  })

  const proprietaires = (data ?? []).map(p => ({ id: p.id, nom_complet: p.nom_complet }))

  const { data: paiements } = useQuery({
    queryKey: ['paiements-portefeuille', agencyId, moisIso],
    enabled: isDemoMode || Boolean(agencyId),
    queryFn: async () => {
      if (isDemoMode) return [] as Paiement[]
      const { data, error } = await supabase
        .from('paiements')
        .select('*')
        .eq('agency_id', agencyId)
        .eq('mois_concerne', moisIso)
      if (error) throw error
      return data as Paiement[]
    },
  })

  const createBienMutation = useMutation({
    mutationFn: async () => {
      if (isDemoMode) {
        toast({ title: 'Mode démo', description: 'Connectez Supabase pour activer cette action.' })
        return
      }
      if (!agencyId) throw new Error('Aucune agence active')
      if (!form.proprietaire_id) throw new Error('Propriétaire obligatoire')
      if (!form.adresse.trim()) throw new Error('Adresse obligatoire')
      if (!form.unit_libelle.trim()) throw new Error('Nom de l’unité obligatoire')

      const { data: bien, error: bienError } = await supabase
        .from('biens')
        .insert({
          agency_id: agencyId,
          proprietaire_id: form.proprietaire_id,
          adresse: form.adresse.trim(),
          type_bien: form.type_bien.trim() || null,
          reference_interne: form.reference_interne.trim() || null,
          statut: 'actif',
        })
        .select('id')
        .single()
      if (bienError) throw bienError

      const { error: unitError } = await supabase.from('rental_units').insert({
        agency_id: agencyId,
        bien_id: bien.id,
        libelle: form.unit_libelle.trim(),
        loyer_mensuel: Number(form.loyer_mensuel || 0),
        charges_mensuelles: Number(form.charges_mensuelles || 0),
      })
      if (unitError) throw unitError
    },
    onSuccess: () => {
      if (!isDemoMode) {
        toast({ title: 'Bien créé' })
        qc.invalidateQueries({ queryKey: ['portefeuille', agencyId] })
      }
      setOpen(false)
      setForm({
        proprietaire_id: '',
        adresse: '',
        type_bien: '',
        reference_interne: '',
        unit_libelle: 'Logement principal',
        loyer_mensuel: '',
        charges_mensuelles: '',
      })
    },
    onError: (err: Error) => toast({ title: 'Erreur', description: err.message, variant: 'destructive' }),
  })

  const filteredData = (data ?? []).map(p => ({
    ...p,
    biens: p.biens.filter(b =>
      !search ||
      b.adresse.toLowerCase().includes(search.toLowerCase()) ||
      p.nom_complet.toLowerCase().includes(search.toLowerCase()) ||
      b.rental_units.some(u => u.locataires.some(l => l.nom_complet.toLowerCase().includes(search.toLowerCase())))
    ),
  })).filter(p => p.biens.length > 0)

  const paymentStatusForUnit = (unit: RentalUnit & { locataires: Locataire[] }) => {
    const locActif = unit.locataires.find(l => l.statut === 'actif')
    if (!locActif) return { label: 'Vacant', variant: 'secondary' as const }
    const total = (paiements ?? []).filter(p => p.locataire_id === locActif.id).reduce((sum, p) => sum + Number(p.total_percu), 0)
    const attendu = (locActif.loyer_mensuel_override ?? unit.loyer_mensuel) + (locActif.charges_mensuelles_override ?? unit.charges_mensuelles)
    if (total >= attendu && attendu > 0) return { label: 'Payé', variant: 'success' as const }
    if (total > 0) return { label: 'Partiel', variant: 'warning' as const }
    return { label: 'Impayé', variant: 'danger' as const }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonBlock className="h-10 w-80" />
        <SkeletonBlock className="h-32" />
        <SkeletonBlock className="h-32" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Portefeuille"
        description="Vue consolidée des biens, propriétaires, unités locatives et paiements du mois."
        actions={
          <>
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />Ajouter un bien
          </Button>
          </>
        }
      />

      <div className="app-panel flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Rechercher adresse, propriétaire, locataire..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-10 border-slate-200 bg-slate-50 pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-1">
            <Button variant={mode === 'par_bien' ? 'default' : 'ghost'} size="sm" onClick={() => setMode('par_bien')} className="rounded-lg">
              <Building2 className="mr-2 h-4 w-4" />Par bien
            </Button>
            <Button variant={mode === 'par_proprietaire' ? 'default' : 'ghost'} size="sm" onClick={() => setMode('par_proprietaire')} className="rounded-lg">
              <Users className="mr-2 h-4 w-4" />Par propriétaire
            </Button>
          </div>
        </div>
      </div>

      {filteredData.length === 0 ? (
        <EmptyState
          title={search ? 'Aucun résultat' : 'Aucun bien dans le portefeuille'}
          description={search ? 'Essayez une autre recherche.' : 'Commencez par créer un propriétaire, puis ajoutez son premier bien.'}
          action={!search && proprietaires.length === 0 ? (
            <Button asChild variant="outline">
              <Link to="/proprietaires">Créer un propriétaire</Link>
            </Button>
          ) : !search ? (
            <Button onClick={() => setOpen(true)}>Ajouter le premier bien</Button>
          ) : null}
        />
      ) : mode === 'par_bien' ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {filteredData.flatMap(p =>
            p.biens.map(b => (
              <Card key={b.id} className="transition-all hover:-translate-y-0.5 hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle>{b.adresse}</CardTitle>
                      <p className="mt-1 text-sm text-slate-500">{p.nom_complet}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant={b.statut === 'actif' ? 'success' : b.statut === 'vendu' ? 'secondary' : 'warning'}>
                        {b.statut}
                      </Badge>
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/biens/${b.id}`}><ChevronRight className="h-4 w-4" /></Link>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {b.rental_units.map(u => {
                      const locActif = u.locataires.find(l => l.statut === 'actif')
                      const loyer = locActif?.loyer_mensuel_override ?? u.loyer_mensuel
                      const charges = locActif?.charges_mensuelles_override ?? u.charges_mensuelles
                      const status = paymentStatusForUnit(u)
                      return (
                        <div key={u.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3 text-sm">
                          <div className="flex items-start justify-between gap-3">
                          <div>
                              <p className="font-medium text-slate-950">{u.libelle}</p>
                              <p className="mt-0.5 text-slate-500">{locActif?.nom_complet ?? 'Aucun locataire actif'}</p>
                          </div>
                          <div className="text-right">
                              <p className="font-semibold text-slate-950">{eur(loyer + charges)}</p>
                              <Badge variant={status.variant} className="mt-1">{status.label}</Badge>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" asChild>
                              <Link to="/paiements"><CreditCard className="mr-2 h-3.5 w-3.5" />Paiement</Link>
                            </Button>
                            <Button size="sm" variant="outline" asChild>
                              <Link to="/frais"><Receipt className="mr-2 h-3.5 w-3.5" />Frais</Link>
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredData.map(p => (
            <Card key={p.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{p.nom_complet}</CardTitle>
                  <Badge variant="outline">{p.biens.length} bien{p.biens.length > 1 ? 's' : ''}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {p.biens.map(b => (
                  <Link key={b.id} to={`/biens/${b.id}`} className="block rounded-2xl border border-slate-200 p-3 transition-colors hover:bg-emerald-50/35">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{b.adresse}</p>
                        <p className="text-xs text-muted-foreground">
                          {b.rental_units.length} unité{b.rental_units.length > 1 ? 's' : ''} —{' '}
                          {b.rental_units.filter(u => u.locataires.some(l => l.statut === 'actif')).length} occupée{b.rental_units.filter(u => u.locataires.some(l => l.statut === 'actif')).length > 1 ? 's' : ''}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nouveau bien</DialogTitle>
          </DialogHeader>

          {proprietaires.length === 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Créez d’abord un propriétaire avant d’ajouter un bien.</p>
              <Button asChild>
                <Link to="/proprietaires">Créer un propriétaire</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1">
                <Label>Propriétaire *</Label>
                <Select value={form.proprietaire_id} onValueChange={v => setForm(f => ({ ...f, proprietaire_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {proprietaires.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.nom_complet}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Adresse du bien *</Label>
                <Input value={form.adresse} onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Type de bien</Label>
                <Input value={form.type_bien} onChange={e => setForm(f => ({ ...f, type_bien: e.target.value }))} placeholder="Appartement, maison…" />
              </div>
              <div className="space-y-1">
                <Label>Référence interne</Label>
                <Input value={form.reference_interne} onChange={e => setForm(f => ({ ...f, reference_interne: e.target.value }))} />
              </div>
              <div className="col-span-2 border-t pt-4">
                <p className="text-sm font-medium">Unité locative</p>
              </div>
              <div className="space-y-1">
                <Label>Nom de l’unité *</Label>
                <Input value={form.unit_libelle} onChange={e => setForm(f => ({ ...f, unit_libelle: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Loyer mensuel</Label>
                <Input type="number" min="0" step="0.01" value={form.loyer_mensuel} onChange={e => setForm(f => ({ ...f, loyer_mensuel: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Charges mensuelles</Label>
                <Input type="number" min="0" step="0.01" value={form.charges_mensuelles} onChange={e => setForm(f => ({ ...f, charges_mensuelles: e.target.value }))} />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            {proprietaires.length > 0 && (
              <Button onClick={() => createBienMutation.mutate()} disabled={createBienMutation.isPending}>
                {createBienMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
