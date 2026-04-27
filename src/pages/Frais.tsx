import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isDemoMode } from '@/lib/supabase'
import { DEMO_FRAIS, DEMO_BIENS_SELECT } from '@/lib/demo-data'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2 } from 'lucide-react'
import { eur, dateFr, moisFr, currentMonthStr } from '@/lib/format'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/lib/auth'
import { PageHeader } from '@/components/ui/page'

export function Frais() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const { agency } = useAuth()
  const agencyId = agency?.id
  const [moisStr, setMoisStr] = useState(currentMonthStr())
  const moisIso = `${moisStr}-01`
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    bien_id: '',
    rental_unit_id: '',
    libelle: '',
    montant_htva: '',
    taux_tva: '21',
    date_frais: new Date().toISOString().slice(0, 10),
    paye_par_agence: true,
    refacturable: true,
  })

  const { data: biens } = useQuery({
    queryKey: ['biens-select', agencyId],
    enabled: isDemoMode || Boolean(agencyId),
    queryFn: async () => {
      if (isDemoMode) return DEMO_BIENS_SELECT

      const { data } = await supabase.from('biens').select('id, adresse, rental_units (id, libelle)').eq('agency_id', agencyId).eq('statut', 'actif')
      return data ?? []
    },
  })

  const { data: frais } = useQuery({
    queryKey: ['frais', agencyId, moisStr],
    enabled: isDemoMode || Boolean(agencyId),
    queryFn: async () => {
      if (isDemoMode) return DEMO_FRAIS.filter(f => f.mois_concerne === moisIso)

      const { data } = await supabase
        .from('frais_divers')
        .select('*, biens (adresse), rental_units (libelle)')
        .eq('agency_id', agencyId)
        .eq('mois_concerne', moisIso)
        .order('date_frais', { ascending: false })
      return data ?? []
    },
  })

  const selectedBien = biens?.find(b => b.id === form.bien_id)
  const units = (selectedBien as unknown as { rental_units: { id: string; libelle: string }[] })?.rental_units ?? []

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isDemoMode) {
        toast({ title: 'Mode démo', description: 'Connectez Supabase pour activer cette action.' })
        return
      }
      const htva = parseFloat(form.montant_htva)
      if (!agencyId) throw new Error('Aucune agence active')
      const tva_rate = parseFloat(form.taux_tva) / 100
      const tva = Math.round(htva * tva_rate * 100) / 100
      const tvac = Math.round((htva + tva) * 100) / 100

      const { error } = await supabase.from('frais_divers').insert({
        agency_id: agencyId,
        bien_id: form.bien_id,
        rental_unit_id: form.rental_unit_id || null,
        mois_concerne: moisIso,
        date_frais: form.date_frais,
        libelle: form.libelle,
        montant_htva: htva,
        taux_tva: parseFloat(form.taux_tva),
        montant_tva: tva,
        montant_tvac: tvac,
        paye_par_agence: form.paye_par_agence,
        refacturable: form.refacturable,
      })
      if (error) throw error
    },
    onSuccess: () => {
      if (!isDemoMode) {
        toast({ title: 'Frais enregistré' })
        qc.invalidateQueries({ queryKey: ['frais', agencyId, moisStr] })
      }
      setOpen(false)
    },
    onError: (err: Error) => toast({ title: 'Erreur', description: err.message, variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (isDemoMode) {
        toast({ title: 'Mode démo', description: 'Connectez Supabase pour activer cette action.' })
        return
      }
      const { error } = await supabase.from('frais_divers').delete().eq('id', id).eq('agency_id', agencyId)
      if (error) throw error
    },
    onSuccess: () => {
      if (!isDemoMode) {
        toast({ title: 'Frais supprimé' })
        qc.invalidateQueries({ queryKey: ['frais', agencyId, moisStr] })
      }
    },
  })

  const totalHtva = (frais ?? []).filter(f => f.refacturable).reduce((s, f) => s + f.montant_htva, 0)
  const totalTvac = (frais ?? []).filter(f => f.refacturable).reduce((s, f) => s + f.montant_tvac, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Frais divers"
        description={`${moisFr(moisIso)} — frais refacturables aux propriétaires`}
        actions={
          <div className="flex items-center gap-2">
            <Input
              type="month"
              value={moisStr}
              onChange={e => setMoisStr(e.target.value)}
              className="h-9 w-40 border-slate-200 bg-white text-sm"
            />
            <Button onClick={() => setOpen(true)} size="sm">
              <Plus className="mr-2 h-3.5 w-3.5" />Ajouter un frais
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4">
        <div className="app-surface p-5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Total refacturable HTVA
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{eur(totalHtva)}</p>
        </div>
        <div className="app-surface p-5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Total refacturable TVAC
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{eur(totalTvac)}</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="table-pro">
            <thead>
              <tr>
                {['Date', 'Libellé', 'Bien', 'HTVA', 'TVA', 'TVAC', 'Refact.', ''].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(frais ?? []).map(f => (
                <tr key={f.id}>
                  <td className="text-slate-600">{dateFr(f.date_frais)}</td>
                  <td className="font-medium text-slate-950">{f.libelle}</td>
                  <td className="text-[12px] text-slate-400">
                    {(f as unknown as { biens: { adresse: string } }).biens?.adresse}
                  </td>
                  <td className="text-slate-700">{eur(f.montant_htva)}</td>
                  <td className="text-slate-400">{eur(f.montant_tva)}</td>
                  <td className="font-semibold text-slate-950">{eur(f.montant_tvac)}</td>
                  <td>
                    <Badge variant={f.refacturable ? 'success' : 'secondary'}>
                      {f.refacturable ? 'Oui' : 'Non'}
                    </Badge>
                  </td>
                  <td>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(f.id)}
                      className="text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(frais ?? []).length === 0 && (
            <p className="py-10 text-center text-[13px] text-slate-400">
              Aucun frais pour ce mois.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouveau frais divers</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <Label>Bien *</Label>
              <Select value={form.bien_id} onValueChange={v => setForm(f => ({ ...f, bien_id: v, rental_unit_id: '' }))}>
                <SelectTrigger><SelectValue placeholder="Choisir un bien" /></SelectTrigger>
                <SelectContent>
                  {biens?.map(b => <SelectItem key={b.id} value={b.id}>{b.adresse}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {units.length > 1 && (
              <div className="col-span-2 space-y-1">
                <Label>Unité (optionnel)</Label>
                <Select value={form.rental_unit_id} onValueChange={v => setForm(f => ({ ...f, rental_unit_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Toutes les unités" /></SelectTrigger>
                  <SelectContent>
                    {units.map((u: { id: string; libelle: string }) => <SelectItem key={u.id} value={u.id}>{u.libelle}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="col-span-2 space-y-1">
              <Label>Libellé *</Label>
              <Input value={form.libelle} onChange={e => setForm(f => ({ ...f, libelle: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Montant HTVA (€) *</Label>
              <Input type="number" step="0.01" value={form.montant_htva} onChange={e => setForm(f => ({ ...f, montant_htva: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>TVA (%)</Label>
              <Input type="number" value={form.taux_tva} onChange={e => setForm(f => ({ ...f, taux_tva: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Date</Label>
              <Input type="date" value={form.date_frais} onChange={e => setForm(f => ({ ...f, date_frais: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Refacturable</Label>
              <Select value={form.refacturable ? 'oui' : 'non'} onValueChange={v => setForm(f => ({ ...f, refacturable: v === 'oui' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="oui">Oui</SelectItem>
                  <SelectItem value="non">Non</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.bien_id || !form.libelle || !form.montant_htva}>
              {isDemoMode ? 'Enregistrer (démo)' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
