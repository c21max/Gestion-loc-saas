import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { isDemoMode } from '@/lib/supabase'
import { DEMO_PROPRIETAIRES } from '@/lib/demo-data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Pencil, Plus, ChevronRight, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'
import type { Proprietaire, ProprietaireType } from '@/types/database'
import { useAuth } from '@/lib/auth'
import { listProprietaires, saveProprietaire } from '@/api/proprietaires.api'

export function Proprietaires() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const { agency } = useAuth()
  const agencyId = agency?.id
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Partial<Proprietaire>>({ type_proprietaire: 'personne_physique' })
  const resetForm = () => setForm({ type_proprietaire: 'personne_physique' })
  const openCreateDialog = () => {
    resetForm()
    setOpen(true)
  }
  const openEditDialog = (proprietaire: Proprietaire) => {
    setForm(proprietaire)
    setOpen(true)
  }
  const handleDialogOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) resetForm()
  }

  const { data, isLoading } = useQuery({
    queryKey: ['proprietaires', agencyId],
    enabled: isDemoMode || Boolean(agencyId),
    queryFn: async () => {
      if (isDemoMode) return DEMO_PROPRIETAIRES

      return listProprietaires(agencyId)
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isDemoMode) {
        toast({ title: 'Mode démo', description: 'Connectez Supabase pour activer cette action.' })
        return
      }
      await saveProprietaire(agencyId, form)
    },
    onSuccess: () => {
      if (!isDemoMode) {
        toast({ title: form.id ? 'Propriétaire mis à jour' : 'Propriétaire créé' })
        qc.invalidateQueries({ queryKey: ['proprietaires', agencyId] })
      }
      setOpen(false)
      resetForm()
    },
    onError: (err: Error) => toast({ title: 'Erreur', description: err.message, variant: 'destructive' }),
  })

  if (isLoading) return <div className="animate-pulse text-muted-foreground">Chargement…</div>

  const typeLabels = {
    personne_physique: 'Personne physique',
    societe: 'Société',
    indivision: 'Indivision',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between border-b border-slate-200/70 pb-5">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">Propriétaires</h1>
          <p className="mt-2 text-sm text-slate-500">Contacts, sociétés et indivisions liés au portefeuille.</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />Ajouter
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(data ?? []).map(p => (
          <Card key={p.id} className="transition-all duration-200 hover:-translate-y-0.5">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">{p.nom_complet}</CardTitle>
                    <Badge variant="outline" className="mt-1 text-xs">{typeLabels[p.type_proprietaire as ProprietaireType]}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEditDialog(p)} aria-label={`Modifier ${p.nom_complet}`}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/proprietaires/${p.id}`}><ChevronRight className="h-4 w-4" /></Link>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1">
              {p.email && <p>{p.email}</p>}
              {p.telephone && <p>{p.telephone}</p>}
              {p.ville && <p>{p.code_postal} {p.ville}</p>}
              <p className="font-medium text-foreground">{(p as unknown as { biens: { id: string }[] }).biens?.length ?? 0} bien(s)</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Modifier' : 'Nouveau propriétaire'}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <Label>Nom complet *</Label>
              <Input value={form.nom_complet ?? ''} onChange={e => setForm(f => ({ ...f, nom_complet: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={form.type_proprietaire} onValueChange={v => setForm(f => ({ ...f, type_proprietaire: v as ProprietaireType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="personne_physique">Personne physique</SelectItem>
                  <SelectItem value="societe">Société</SelectItem>
                  <SelectItem value="indivision">Indivision</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={form.email ?? ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Téléphone</Label>
              <Input value={form.telephone ?? ''} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} />
            </div>
            <div className="space-y-1">
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
              <Label>N° TVA</Label>
              <Input value={form.numero_tva ?? ''} onChange={e => setForm(f => ({ ...f, numero_tva: e.target.value }))} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleDialogOpenChange(false)}>Annuler</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Enregistrement…' : isDemoMode ? 'Enregistrer (démo)' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
