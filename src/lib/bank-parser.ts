import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'

GlobalWorkerOptions.workerSrc = workerUrl

export type ParsedBankMovement = {
  operation_date: string
  value_date: string | null
  direction: 'credit' | 'debit'
  amount: number
  currency: 'EUR'
  counterparty_name: string | null
  counterparty_iban: string | null
  communication: string | null
  raw_label: string
  category: 'loyer' | 'charges' | 'frais' | 'autre'
  status: 'a_valider'
  dedupe_hash: string
}

function toIsoDate(date: string) {
  const match = date.match(/(\d{2})[./-](\d{2})[./-](\d{4})/)
  if (!match) return null
  return `${match[3]}-${match[2]}-${match[1]}`
}

function toAmount(value: string) {
  const normalized = value.replace(/\s/g, '').replace(/\./g, '').replace(',', '.')
  const amount = Number.parseFloat(normalized)
  return Number.isFinite(amount) ? Math.abs(amount) : null
}

async function sha256(value: string) {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function extractPdfText(file: File) {
  const buffer = await file.arrayBuffer()
  const pdf = await getDocument({ data: buffer }).promise
  const pages: string[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    const text = content.items
      .map(item => ('str' in item ? String(item.str) : ''))
      .filter(Boolean)
      .join('\n')
    pages.push(text)
  }

  return pages.join('\n')
}

function splitIntoBlocks(text: string) {
  const normalized = text
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')

  const dateRe = /\b\d{2}[./-]\d{2}[./-]\d{4}\b/g
  const matches = [...normalized.matchAll(dateRe)]
  if (matches.length === 0) return []

  return matches.map((match, index) => {
    const start = match.index ?? 0
    const end = matches[index + 1]?.index ?? normalized.length
    return normalized.slice(start, end).trim()
  })
}

function guessCounterparty(raw: string) {
  const compact = raw
    .replace(/\b\d{2}[./-]\d{2}[./-]\d{4}\b/g, ' ')
    .replace(/[+-]?\s*\d{1,3}(?:[ .]\d{3})*(?:,\d{2})\b/g, ' ')
    .replace(/\bBE\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\b/gi, ' ')
    .replace(/\b(EUR|EURO|VALUTA|DATE|COMMUNICATION|VIREMENT|PAIEMENT|CARTE|BANCONTACT)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return compact.slice(0, 80) || null
}

export async function parseBankPdf(file: File): Promise<ParsedBankMovement[]> {
  const text = await extractPdfText(file)
  const blocks = splitIntoBlocks(text)
  const movements: ParsedBankMovement[] = []

  for (const block of blocks) {
    const dateMatch = block.match(/\b\d{2}[./-]\d{2}[./-]\d{4}\b/)
    const operationDate = dateMatch ? toIsoDate(dateMatch[0]) : null
    if (!operationDate) continue

    const amountMatches = [...block.matchAll(/([+-]?)\s*(\d{1,3}(?:[ .]\d{3})*(?:,\d{2})|\d+,\d{2})\b/g)]
    if (amountMatches.length === 0) continue

    const amountMatch = amountMatches[amountMatches.length - 1]
    const amount = toAmount(amountMatch[2])
    if (!amount || amount <= 0) continue

    const sign = amountMatch[1]
    const lower = block.toLowerCase()
    const direction: 'credit' | 'debit' =
      sign === '-' || (lower.includes('debit') && !lower.includes('credit') && !lower.includes('crédit')) ? 'debit' : 'credit'

    const iban = block.match(/\bBE\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\b/i)?.[0].replace(/\s/g, '') ?? null
    const communication =
      block.match(/(?:communication|comm\.?|message|communication structurée)\s*:?\s*([^\n]{3,120})/i)?.[1]?.trim() ??
      null

    const rawLabel = block.replace(/\s+/g, ' ').trim().slice(0, 1000)
    const hash = await sha256(`${operationDate}|${amount}|${iban ?? ''}|${rawLabel}`)

    movements.push({
      operation_date: operationDate,
      value_date: null,
      direction,
      amount,
      currency: 'EUR',
      counterparty_name: guessCounterparty(block),
      counterparty_iban: iban,
      communication,
      raw_label: rawLabel,
      category: 'loyer',
      status: 'a_valider',
      dedupe_hash: hash,
    })
  }

  return movements
}
