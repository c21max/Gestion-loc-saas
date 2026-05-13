import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isDemoMode } from '@/lib/supabase'
import { DEMO_LOCATAIRES_AVEC_UNITS } from '@/lib/demo-data'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { dateFr, eur } from '@/lib/format'
import { Plus, UserCheck } from 'lucide-react'
import { currentMonthStr } from '@/lib/format'
import { useAuth } from '@/lib/auth'
import { useToast } from '@/hooks/use-toast'
import { Link } from 'react-router-dom'
import {
  createLocataire,
  listCurrentTenantPaymentTotals,
  listLocatairesWithUnits,
  listRentalUnitsForTenantSelect,
} from '@/api/locataires.api'

export function Locataires() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const { agency } = useAuth()
  const agencyId = agency?.id
  const moisIso = `${currentMonthStr()}-01`
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    rental_unit_id: '',
    nom_complet: '',
    email: '',
    telephone: '',
    date_debut_bail: '',
    date_fin_bail: '',
    loyer_mensuel_override: '',
    charges_mensuelles_override: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['locataires', agencyId],
    enabled: isDemoMode || Boolean(agencyId),
    queryFn: async () => {
      if (isDemoMode) return DEMO_LOCATAIRES_AVEC_UNITS

      return listLocatairesWithUnits(agencyId)
    },
  })

  const { data: rentalUnits } = useQuery({
    queryKey: ['rental-units-select', agencyId],
    enabled: isDemoMode || Boolean(agencyId),
    queryFn: async () => {
      if (isDemoMode) return []

      return listRentalUnitsForTenantSelect(agencyId)
    },
  })

  const { data: paiements } = useQuery({
    queryKey: ['paiements', agencyId, currentMonthStr()],
    enabled: isDemoMode || Boolean(agencyId),
    queryFn: async () => {
      if (isDemoMode) return []

      return listCurrentTenantPaymentTotals(agencyId, moisIso)
    },
  })

  const createLocataireMutation = useMutation({
    mutationFn: async () => {
      if (isDemoMode) {
        toast({ title: 'Mode démo', description: 'Connectez Supabase pour activer cette action.' })
        return
      }
      await createLocataire(agencyId, form)
    },
    onSuccess: () => {
      if (!isDemoMode) {
        toast({ title: 'Locataire créé' })
        qc.invalidateQueries({ queryKey: ['locataires', agencyId] })
        qc.invalidateQueries({ queryKey: ['portefeuille', agencyId] })
      }
      setOpen(false)
      setForm({
        rental_unit_id: '',
        nom_complet: '',
        email: '',
        telephone: '',
        date_debut_bail: '',
        date_fin_bail: '',
        loyer_mensuel_override: '',
        charges_mensuelles_override: '',
      })
    },
    onError: (err: Error) => toast({ title: 'Erreur', description: err.message, variant: 'destructive' }),
  })

  if (isLoading) return <div className="animate-pulse text-muted-foreground">Chargement…</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Locataires</h1>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />Ajouter
        </Button>
      </div>

      {(data ?? []).length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
          <p>Aucun locataire enregistré.</p>
          {(rentalUnits ?? []).length === 0 ? (
            <Button asChild variant="outline">
              <Link to="/portefeuille">Créer un bien</Link>
            </Button>
          ) : (
            <Button onClick={() => setOpen(true)}>Ajouter le premier locataire</Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(data ?? []).map(loc => {
          const unit = (loc as unknown as { rental_units: { libelle: string; loyer_mensuel: number; charges_mensuelles: number; biens: { adresse: string; proprietaires: { nom_complet: string } } } }).rental_units
          const loyer = loc.loyer_mensuel_override ?? unit?.loyer_mensuel ?? 0
          const charges = loc.charges_mensuelles_override ?? unit?.charges_mensuelles ?? 0
          const attendu = loyer + charges
          const paye = (paiements ?? [])
            .filter(p => p.locataire_id === loc.id)
            .reduce((sum, p) => sum + Number(p.total_percu), 0)
          const solde = attendu - paye

          return (
            <Card key={loc.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <UserCheck className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{loc.nom_complet}</p>
                      <Badge
                        variant={loc.statut === 'actif' ? 'success' : loc.statut === 'sorti' ? 'secondary' : 'warning'}
                        className="text-xs mt-0.5"
                      >
                        {loc.statut}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-medium">{eur(attendu)}</p>
                    <p className="text-xs text-green-600">Payé {eur(paye)}</p>
                    <p className={`text-xs ${solde > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                      Solde {eur(solde)}
                    </p>
                  </div>
                </div>

                {unit && (
                  <div className="text-xs text-muted-foreground border-t pt-2 space-y-0.5">
                    <p className="font-medium text-foreground">{unit.biens?.adresse}</p>
                    <p>{unit.libelle}</p>
                    <p>{unit.biens?.proprietaires?.nom_complet}</p>
                  </div>
                )}

                {(loc.date_debut_bail || loc.date_fin_bail) && (
                  <p className="text-xs text-muted-foreground">
                    Bail : {dateFr(loc.date_debut_bail)} → {loc.date_fin_bail ? dateFr(loc.date_fin_bail) : 'indéterminée'}
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nouveau locataire</DialogTitle>
          </DialogHeader>

          {(rentalUnits ?? []).length === 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Créez d’abord un bien avec une unité locative avant d’ajouter un locataire.</p>
              <Button asChild>
                <Link to="/portefeuille">Créer un bien</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1">
                <Label>Unité locative *</Label>
                <Select value={form.rental_unit_id} onValueChange={v => setForm(f => ({ ...f, rental_unit_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {(rentalUnits ?? []).map(unit => {
                      const bien = (unit as unknown as { biens?: { adresse?: string } | null }).biens
                      return (
                        <SelectItem key={unit.id} value={unit.id}>
                          {bien?.adresse ?? 'Bien'} - {unit.libelle}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Nom complet *</Label>
                <Input value={form.nom_complet} onChange={e => setForm(f => ({ ...f, nom_complet: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Téléphone</Label>
                <Input value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Début du bail</Label>
                <Input type="date" value={form.date_debut_bail} onChange={e => setForm(f => ({ ...f, date_debut_bail: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Fin du bail</Label>
                <Input type="date" value={form.date_fin_bail} onChange={e => setForm(f => ({ ...f, date_fin_bail: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Loyer spécifique</Label>
                <Input type="number" min="0" step="0.01" value={form.loyer_mensuel_override} onChange={e => setForm(f => ({ ...f, loyer_mensuel_override: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Charges spécifiques</Label>
                <Input type="number" min="0" step="0.01" value={form.charges_mensuelles_override} onChange={e => setForm(f => ({ ...f, charges_mensuelles_override: e.target.value }))} />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            {(rentalUnits ?? []).length > 0 && (
              <Button onClick={() => createLocataireMutation.mutate()} disabled={createLocataireMutation.isPending}>
                {createLocataireMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
