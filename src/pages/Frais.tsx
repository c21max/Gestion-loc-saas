import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { isDemoMode } from '@/lib/supabase'
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
import { MetricCard, PageHeader } from '@/components/ui/page'
import { motion } from 'framer-motion'
import { createFrais, deleteFrais, listBiensForFeeSelect, listFraisForMonth } from '@/api/frais.api'

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
      return listBiensForFeeSelect(agencyId)
    },
  })

  const { data: frais } = useQuery({
    queryKey: ['frais', agencyId, moisStr],
    enabled: isDemoMode || Boolean(agencyId),
    queryFn: async () => {
      if (isDemoMode) return DEMO_FRAIS.filter(f => f.mois_concerne === moisIso)
      return listFraisForMonth(agencyId, moisIso)
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
      await createFrais(agencyId, moisIso, form)
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
      await deleteFrais(agencyId, id)
    },
    onSuccess: () => {
      if (!isDemoMode) {
        toast({ title: 'Frais supprimé' })
        qc.invalidateQueries({ queryKey: ['frais', agencyId, moisStr] })
      }
    },
  })

  const refacturables = (frais ?? []).filter(f => f.refacturable)
  const totalHtva = refacturables.reduce((s, f) => s + f.montant_htva, 0)
  const totalTvac = refacturables.reduce((s, f) => s + f.montant_tvac, 0)

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
              className="h-9 w-40 border-slate-200 bg-white text-sm shadow-none"
            />
            <Button onClick={() => setOpen(true)} size="sm">
              <Plus className="mr-2 h-3.5 w-3.5" />Ajouter
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MetricCard
          index={0}
          label="Total refacturable HTVA"
          value={eur(totalHtva)}
          detail={`${refacturables.length} frais refacturable(s)`}
          tone="amber"
        />
        <MetricCard
          index={1}
          label="Total refacturable TVAC"
          value={eur(totalTvac)}
          detail="TVA incluse"
          tone="red"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {(frais ?? []).length === 0 ? (
            <div className="p-6">
              <div className="flex min-h-[180px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-center">
                <p className="text-sm font-medium text-slate-700">Aucun frais pour ce mois</p>
                <p className="mt-1 text-xs text-slate-400">Ajoutez un frais pour commencer</p>
                <Button size="sm" className="mt-4" onClick={() => setOpen(true)}>
                  <Plus className="mr-2 h-3.5 w-3.5" />Ajouter un frais
                </Button>
              </div>
            </div>
          ) : (
            <motion.div
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.04 } } }}
            >
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
                    <motion.tr
                      key={f.id}
                      variants={{
                        hidden: { opacity: 0, y: 6 },
                        show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } },
                      }}
                    >
                      <td className="text-slate-500">{dateFr(f.date_frais)}</td>
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
                          className="text-rose-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau frais divers</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Bien *</Label>
              <Select value={form.bien_id} onValueChange={v => setForm(f => ({ ...f, bien_id: v, rental_unit_id: '' }))}>
                <SelectTrigger><SelectValue placeholder="Choisir un bien" /></SelectTrigger>
                <SelectContent>
                  {biens?.map(b => <SelectItem key={b.id} value={b.id}>{b.adresse}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {units.length > 1 && (
              <div className="col-span-2 space-y-1.5">
                <Label>Unité (optionnel)</Label>
                <Select value={form.rental_unit_id} onValueChange={v => setForm(f => ({ ...f, rental_unit_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Toutes les unités" /></SelectTrigger>
                  <SelectContent>
                    {units.map((u: { id: string; libelle: string }) => (
                      <SelectItem key={u.id} value={u.id}>{u.libelle}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="col-span-2 space-y-1.5">
              <Label>Libellé *</Label>
              <Input value={form.libelle} onChange={e => setForm(f => ({ ...f, libelle: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Montant HTVA (€) *</Label>
              <Input type="number" step="0.01" value={form.montant_htva} onChange={e => setForm(f => ({ ...f, montant_htva: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>TVA (%)</Label>
              <Input type="number" value={form.taux_tva} onChange={e => setForm(f => ({ ...f, taux_tva: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={form.date_frais} onChange={e => setForm(f => ({ ...f, date_frais: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
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
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !form.bien_id || !form.libelle || !form.montant_htva}
            >
              {saveMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
