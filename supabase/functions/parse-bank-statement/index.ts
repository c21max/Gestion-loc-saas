// Edge Function Deno — parsing extraits bancaires PDF
// Méthode 1 : extraction texte pdfjs-dist
// Méthode 2 : fallback Gemini Flash si < 80% des mouvements estimés

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ParsedMovement {
  operation_date: string
  value_date?: string
  direction: 'credit' | 'debit'
  amount: number
  counterparty_name?: string
  counterparty_iban?: string
  communication?: string
  raw_label: string
}

// ─── Heuristique : estimer le nombre de mouvements dans le texte ───────────
function estimateMovementCount(text: string): number {
  const matches = text.match(/[+-]?\s*\d{1,3}(?:\s\d{3})*[,.]?\d{0,2}\s*(?:EUR|€)/gi) ?? []
  return Math.max(matches.length, 0)
}

// ─── Parser Crelan (format textuel standard) ──────────────────────────────
function parseCrelan(text: string): ParsedMovement[] {
  const movements: ParsedMovement[] = []
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  // Format Crelan : DD/MM/YYYY ... +/- X.XXX,XX
  const dateAmountRe = /(\d{2}\/\d{2}\/\d{4}).*?([+-])\s*([\d\s]{1,10}[,.]?\d{0,2})/
  const ibanRe = /BE\d{2}\s?\d{4}\s?\d{4}\s?\d{4}/

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const match = line.match(dateAmountRe)
    if (!match) continue

    const [, dateStr, sign, amountStr] = match
    const [day, month, year] = dateStr.split('/')
    const operationDate = `${year}-${month}-${day}`
    const amount = parseFloat(amountStr.replace(/\s/g, '').replace(',', '.'))
    if (isNaN(amount) || amount <= 0) continue

    // Collecter les lignes suivantes pour le libellé (max 5 lignes)
    const labelLines: string[] = [line]
    for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
      if (lines[j].match(dateAmountRe)) break
      labelLines.push(lines[j])
    }
    const rawLabel = labelLines.join(' | ')

    // Extraire IBAN donneur
    const ibanMatch = rawLabel.match(ibanRe)
    const counterpartyIban = ibanMatch?.[0].replace(/\s/g, '') ?? undefined

    // Extraire communication (entre guillemets ou après "COMM:")
    const commMatch = rawLabel.match(/(?:COMM\.\s*:|Communication\s*:|\/\/)(.{3,60})/i)

    movements.push({
      operation_date: operationDate,
      direction: sign === '+' ? 'credit' : 'debit',
      amount,
      counterparty_iban: counterpartyIban,
      communication: commMatch?.[1]?.trim(),
      raw_label: rawLabel,
    })
  }

  return movements
}

// ─── Fallback Gemini Flash ────────────────────────────────────────────────
async function parseWithGemini(text: string, geminiApiKey: string): Promise<ParsedMovement[]> {
  const prompt = `Extrais tous les mouvements bancaires du texte suivant en JSON.
Retourne UNIQUEMENT un tableau JSON avec les champs :
- operation_date (YYYY-MM-DD)
- direction ("credit" ou "debit")
- amount (nombre positif)
- counterparty_name (optionnel)
- counterparty_iban (optionnel, format BEXX XXXX XXXX XXXX)
- communication (optionnel)
- raw_label (libellé brut)

Texte :
${text.slice(0, 8000)}`

  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${geminiApiKey}`,
    },
    body: JSON.stringify({
      model: 'gemini-1.5-flash',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) throw new Error(`Gemini error: ${res.status}`)
  const data = await res.json()
  const content = data.choices?.[0]?.message?.content ?? '{}'
  const parsed = JSON.parse(content)
  return Array.isArray(parsed) ? parsed : (parsed.movements ?? [])
}

// ─── Calcul dedupe hash ───────────────────────────────────────────────────
async function dedupeHash(m: ParsedMovement): Promise<string> {
  const str = `${m.operation_date}|${m.amount}|${m.counterparty_iban ?? ''}|${m.communication ?? ''}`
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { import_id, storage_path } = await req.json() as { import_id: string; storage_path: string }
    if (!import_id || !storage_path) {
      return new Response(
        JSON.stringify({ error: 'import_id and storage_path are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const authHeader = req.headers.get('Authorization') ?? ''
    const accessToken = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: userData, error: userErr } = await supabase.auth.getUser(accessToken)
    if (userErr || !userData.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { data: importRecord, error: importErr } = await supabase
      .from('bank_imports')
      .select('agency_id, storage_path')
      .eq('id', import_id)
      .single()
    if (importErr) throw importErr

    const agencyId = importRecord.agency_id as string
    if (importRecord.storage_path !== storage_path || !storage_path.startsWith(`${agencyId}/`)) {
      return new Response(
        JSON.stringify({ error: 'Storage path does not match the bank import' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { data: membership, error: membershipErr } = await supabase
      .from('agency_users')
      .select('id')
      .eq('agency_id', agencyId)
      .eq('user_id', userData.user.id)
      .maybeSingle()
    if (membershipErr) throw membershipErr
    if (!membership) {
      return new Response(
        JSON.stringify({ error: 'Not allowed for this agency' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // 1. Télécharger le PDF
    const { data: fileData, error: dlErr } = await supabase.storage
      .from('bank-statements')
      .download(storage_path)
    if (dlErr) throw dlErr

    const pdfBuffer = await fileData.arrayBuffer()

    // 2. Extraire le texte (on utilise une approche simplifiée côté Deno)
    // Note: pdfjs-dist n'est pas disponible nativement en Deno — on utilise un fetch vers un worker ou on lit le texte brut
    // Pour la V1, on extrait le texte brut du PDF (ASCII embedded text)
    const rawText = new TextDecoder('utf-8', { fatal: false }).decode(pdfBuffer)
    const textContent = rawText.replace(/[^\x20-\x7E\n]/g, ' ').replace(/\s+/g, ' ')

    // 3. Estimation
    const estimated = estimateMovementCount(rawText)

    // 4. Parser Crelan
    let movements = parseCrelan(textContent)
    let parseMethod: 'text' | 'ai' = 'text'

    // 5. Fallback Gemini si < 80% des mouvements estimés
    if (estimated > 0 && movements.length < estimated * 0.8) {
      const geminiKey = Deno.env.get('GEMINI_API_KEY')
      if (geminiKey) {
        movements = await parseWithGemini(rawText, geminiKey)
        parseMethod = 'ai'
      }
    }

    if (movements.length === 0) {
      await supabase.from('bank_imports').update({ status: 'erreur', notes: 'Aucun mouvement extrait' }).eq('id', import_id).eq('agency_id', agencyId)
      return new Response(JSON.stringify({ error: 'No movements' }), { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 6. Récupérer locataires actifs + aliases pour le scoring
    const { data: locataires } = await supabase
      .from('locataires')
      .select('id, nom_complet, rental_unit_id, rental_units (id, loyer_mensuel, charges_mensuelles, biens (id, adresse))')
      .eq('agency_id', agencyId)
      .eq('statut', 'actif')

    const { data: aliases } = await supabase.from('payment_aliases').select('*').eq('agency_id', agencyId)

    const today = new Date()
    const currentMonthIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`

    const { data: expectedRents } = await supabase
      .from('monthly_expected_rents')
      .select('*')
      .eq('agency_id', agencyId)
      .eq('mois_concerne', currentMonthIso)

    // 7. Insérer les mouvements avec scoring
    let matchedCount = 0
    for (const m of movements) {
      const hash = await dedupeHash(m)

      // Scoring simplifié (version allégée de scoreLocataires côté edge)
      let bestScore = 0
      let bestLocataire: string | null = null
      let bestBien: string | null = null

      for (const loc of locataires ?? []) {
        let score = 0
        const alias = (aliases ?? []).find(a =>
          a.locataire_id === loc.id &&
          ((m.counterparty_iban && a.counterparty_iban === m.counterparty_iban) ||
           (m.counterparty_name && a.counterparty_name_normalized === m.counterparty_name?.toLowerCase()))
        )
        if (alias) score += alias.counterparty_iban === m.counterparty_iban ? 60 : 50

        const expected = (expectedRents ?? []).find(e => e.locataire_id === loc.id)
        if (expected && Math.abs(m.amount - (expected.loyer_attendu + expected.charges_attendues)) <= 0.5) score += 40

        if (score > bestScore) {
          bestScore = score
          bestLocataire = loc.id
          const unit = (loc as unknown as { rental_units: { biens: { id: string } } }).rental_units
          bestBien = unit?.biens?.id ?? null
        }
      }

      const insertData = {
        agency_id: agencyId,
        import_id,
        operation_date: m.operation_date,
        value_date: m.value_date ?? null,
        direction: m.direction,
        amount: m.amount,
        currency: 'EUR',
        counterparty_name: m.counterparty_name ?? null,
        counterparty_iban: m.counterparty_iban ?? null,
        communication: m.communication ?? null,
        raw_label: m.raw_label,
        category: 'loyer' as const,
        status: 'a_valider' as const,
        match_score: bestScore > 0 ? bestScore : null,
        suggested_locataire_id: bestLocataire,
        suggested_bien_id: bestBien,
        dedupe_hash: hash,
      }

      const { error: insErr } = await supabase
        .from('bank_movements')
        .upsert(insertData, { onConflict: 'import_id,dedupe_hash', ignoreDuplicates: true })
      if (insErr) throw insErr

      if (bestScore >= 90 && m.direction === 'credit') {
        const { data: bankMovement, error: movementErr } = await supabase
          .from('bank_movements')
          .select('id')
          .eq('agency_id', agencyId)
          .eq('import_id', import_id)
          .eq('dedupe_hash', hash)
          .single()
        if (movementErr) throw movementErr

        // Auto-créer le paiement si score parfait
        const loc = (locataires ?? []).find(l => l.id === bestLocataire)
        const expected = (expectedRents ?? []).find(e => e.locataire_id === bestLocataire)
        if (loc && expected && Math.abs(m.amount - (expected.loyer_attendu + expected.charges_attendues)) <= 0.5) {
          const unit = (loc as unknown as { rental_units: { id: string; biens: { id: string } } }).rental_units
          const { data: existingPayment, error: existingPaymentErr } = await supabase
            .from('paiements')
            .select('id')
            .eq('agency_id', agencyId)
            .eq('bank_movement_id', bankMovement.id)
            .maybeSingle()
          if (existingPaymentErr) throw existingPaymentErr

          if (existingPayment) {
            await supabase
              .from('bank_movements')
              .update({ status: 'paiement_cree', paiement_id: existingPayment.id })
              .eq('id', bankMovement.id)
              .eq('agency_id', agencyId)
            continue
          }

          const { data: paiement, error: paiementErr } = await supabase.from('paiements').insert({
            agency_id: agencyId,
            locataire_id: loc.id,
            rental_unit_id: unit.id,
            bien_id: unit.biens.id,
            mois_concerne: currentMonthIso,
            date_paiement: m.operation_date,
            loyer_htva: expected.loyer_attendu,
            charges: expected.charges_attendues,
            total_percu: m.amount,
            statut: 'paye',
            bank_movement_id: bankMovement.id,
            notes: 'Paiement cree automatiquement depuis Edge Function bancaire',
          })
            .select('id')
            .single()
          if (paiementErr) throw paiementErr

          const { error: movementUpdateErr } = await supabase
            .from('bank_movements')
            .update({ status: 'paiement_cree', paiement_id: paiement.id })
            .eq('id', bankMovement.id)
            .eq('agency_id', agencyId)
          if (movementUpdateErr) throw movementUpdateErr

          matchedCount++
        }
      }
    }

    // 8. Mettre à jour le statut de l'import
    const periodDates = movements.map(m => m.operation_date).sort()
    await supabase.from('bank_imports').update({
      status: 'traite',
      parse_method: parseMethod,
      total_movements: movements.length,
      matched_movements: matchedCount,
      period_start: periodDates[0] ?? null,
      period_end: periodDates[periodDates.length - 1] ?? null,
    }).eq('id', import_id).eq('agency_id', agencyId)

    return new Response(
      JSON.stringify({ ok: true, total: movements.length, matched: matchedCount, method: parseMethod }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('parse-bank-statement error:', err)
    return new Response(
      JSON.stringify({ error: 'Erreur interne pendant le parsing bancaire' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
