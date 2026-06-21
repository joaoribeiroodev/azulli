/**
 * Detector de despesas recorrentes (assinaturas, contas fixas).
 *
 * Estratégia 100% determinística (sem IA):
 *   1. Pega despesas pagas dos últimos 6 meses.
 *   2. Computa fingerprint da descrição (normalize: lowercase, sem números de
 *      cartão, sem datas, sem prefixos comuns de banco BR, sem espaços extras).
 *   3. Agrupa por fingerprint.
 *   4. Pra cada grupo com >= 3 ocorrências, valida se:
 *        - 80% dos valores caem dentro de mediana ± 15% (preço estável)
 *        - mediana dos gaps entre datas consecutivas é 22..38 dias (mensal)
 *   5. Retorna lista ordenada por gasto mensal estimado (desc).
 */

import { cache } from "react"

import { createClient } from "@/lib/supabase/server"
import { addDaysYMD, todayLocalBR } from "@/lib/utils/date"

const LOOKBACK_MONTHS = 6
const MIN_OCCURRENCES = 3
const PRICE_TOLERANCE = 0.15
const STABLE_RATIO = 0.8
const MIN_INTERVAL_DAYS = 22
const MAX_INTERVAL_DAYS = 38
const STALE_DAYS = 90

export type RecurringExpense = {
  /** Fingerprint usado pra agrupar (não exibir na UI). */
  fingerprint: string
  /** Descrição "real" mais recente (usar como rótulo). */
  sampleDescription: string
  /** Categoria mais comum entre as ocorrências. */
  category: string | null
  /** Quantas vezes apareceu nos últimos 6 meses. */
  count: number
  /** Mediana do valor (representa o gasto mensal). */
  monthlyAmount: number
  /** Data (ISO) da ocorrência mais recente. */
  lastSeen: string
  /** Sem movimentação há 90+ dias — possível corte de custo. */
  possiblyCanceled: boolean
}

// ---------------------------------------------------------------------------
// Fingerprint
// ---------------------------------------------------------------------------

const BANK_PREFIXES = [
  "pagto ",
  "pagamento ",
  "compra ",
  "debito ",
  "débito ",
  "transferencia ",
  "transferência ",
  "ted ",
  "doc ",
  "pix ",
  "boleto ",
]

/**
 * Normaliza descrição pra agrupar variações da mesma cobrança.
 * Ex: "PAGTO COMPRA NETFLIX 12/03" e "PAGTO COMPRA NETFLIX 12/04"
 *     → ambos viram "netflix"
 */
export function fingerprint(description: string): string {
  let s = description.trim().toLowerCase()

  // Remove acentos
  s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")

  // Remove datas (DD/MM, DD/MM/YYYY, DD-MM, etc)
  s = s.replace(/\b\d{1,2}[\/\-]\d{1,2}([\/\-]\d{2,4})?\b/g, " ")

  // Remove números de cartão mascarados (**** 1234 ou xxxx 1234)
  s = s.replace(/[\*x]{2,}\s*\d{2,4}/g, " ")

  // Remove sequências de 4+ dígitos (ids de transação, parcelas tipo "1/12")
  s = s.replace(/\b\d{4,}\b/g, " ")
  s = s.replace(/\b\d+\s*\/\s*\d+\b/g, " ") // 1/12, 5/10

  // Remove prefixos comuns de extrato BR
  for (const prefix of BANK_PREFIXES) {
    if (s.startsWith(prefix)) {
      s = s.slice(prefix.length)
    }
  }

  // Remove pontuação genérica e collapse de espaços
  s = s.replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim()

  return s
}

// ---------------------------------------------------------------------------
// Helpers estatísticos
// ---------------------------------------------------------------------------

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

function modeOrFirst<T>(items: T[]): T | null {
  if (items.length === 0) return null
  const counts = new Map<T, number>()
  for (const item of items) {
    counts.set(item, (counts.get(item) ?? 0) + 1)
  }
  let best: T = items[0]
  let bestCount = 0
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value
      bestCount = count
    }
  }
  return best
}

function dayDiff(aIso: string, bIso: string): number {
  const a = new Date(aIso).getTime()
  const b = new Date(bIso).getTime()
  return Math.abs(a - b) / (1000 * 60 * 60 * 24)
}

// ---------------------------------------------------------------------------
// Query + análise
// ---------------------------------------------------------------------------

type RawTx = {
  id: string
  amount: number
  description: string | null
  category: string | null
  due_date: string
}

export const detectRecurringExpenses = cache(async (): Promise<RecurringExpense[]> => {
  const supabase = await createClient()

  const cutoffIso = addDaysYMD(todayLocalBR(), -(LOOKBACK_MONTHS * 31))

  const { data, error } = await supabase
    .from("transactions")
    .select("id, amount, description, category, due_date")
    .eq("type", "expense")
    .eq("status", "paid")
    .gte("due_date", cutoffIso)
    .not("description", "is", null)
    .order("due_date", { ascending: false })
    .limit(2000)

  if (error || !data) {
    console.error("[insights] detectRecurringExpenses query failed:", error)
    return []
  }

  // Agrupa por fingerprint
  const groups = new Map<string, RawTx[]>()
  for (const row of data) {
    if (!row.description) continue
    const fp = fingerprint(row.description)
    if (fp.length < 3) continue
    const arr = groups.get(fp) ?? []
    arr.push({
      id: row.id,
      amount: Number(row.amount),
      description: row.description,
      category: row.category,
      due_date: row.due_date,
    })
    groups.set(fp, arr)
  }

  const recurring: RecurringExpense[] = []

  for (const [fp, items] of groups) {
    // Uma ocorrência por mês — evita inflar contagem após importação OFX em lote
    const byMonth = new Map<string, RawTx>()
    for (const item of items) {
      const month = item.due_date.slice(0, 7)
      const existing = byMonth.get(month)
      if (!existing || item.due_date > existing.due_date) {
        byMonth.set(month, item)
      }
    }
    const deduped = [...byMonth.values()]
    if (deduped.length < MIN_OCCURRENCES) continue

    const calendarMonths = new Set(deduped.map((x) => x.due_date.slice(0, 7)))
    if (calendarMonths.size < 2) continue

    // Valor estável?
    const amounts = deduped.map((x) => x.amount)
    const med = median(amounts)
    if (med <= 0) continue
    const stable = amounts.filter(
      (a) => Math.abs(a - med) / med <= PRICE_TOLERANCE
    ).length
    if (stable / amounts.length < STABLE_RATIO) continue

    // Cadência mensal?
    const sortedDates = deduped
      .map((x) => x.due_date)
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    const gaps: number[] = []
    for (let i = 1; i < sortedDates.length; i++) {
      gaps.push(dayDiff(sortedDates[i - 1], sortedDates[i]))
    }
    const medGap = median(gaps)
    if (medGap < MIN_INTERVAL_DAYS || medGap > MAX_INTERVAL_DAYS) continue

    // Pega ocorrência mais recente como amostra
    const latest = deduped.reduce((acc, cur) =>
      cur.due_date > acc.due_date ? cur : acc
    )

    const daysSinceLast = dayDiff(latest.due_date, todayLocalBR())

    recurring.push({
      fingerprint: fp,
      sampleDescription: latest.description ?? fp,
      category: modeOrFirst(
        deduped.map((x) => x.category).filter((c): c is string => Boolean(c))
      ),
      count: deduped.length,
      monthlyAmount: med,
      lastSeen: latest.due_date,
      possiblyCanceled: daysSinceLast >= STALE_DAYS,
    })
  }

  recurring.sort((a, b) => b.monthlyAmount - a.monthlyAmount)
  return recurring
})
