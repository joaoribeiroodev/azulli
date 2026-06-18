import "server-only"

import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import { todayLocalBR, utcToLocalDateBR } from "@/lib/utils/date"
import { detectRecurringExpenses } from "@/lib/insights/recurring"

import { computeForecast } from "./engine"
import type {
  ForecastEngineInput,
  ForecastHorizon,
  ForecastSeries,
  RecurringTemplate,
  ScheduledTx,
} from "./types"

// ---------------------------------------------------------------------------
// computeOpeningBalance — saldo realizado até hoje
// ---------------------------------------------------------------------------

/**
 * Saldo de caixa REALIZADO: soma todas as receitas pagas menos despesas
 * pagas (status='paid'). Reflete o "dinheiro em mãos" hoje.
 *
 * NOTA: não é saldo bancário literal — é saldo financeiro do que foi
 * registrado no Azulli. Se o usuário não lança tudo, vai divergir.
 */
async function computeOpeningBalance(): Promise<number> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("transactions")
    .select("type, amount")
    .eq("status", "paid")

  if (error || !data) {
    console.error("[forecast] opening balance query failed:", error)
    return 0
  }

  let balance = 0
  for (const row of data) {
    const amount = Number(row.amount)
    if (row.type === "income") balance += amount
    else if (row.type === "expense") balance -= amount
  }
  return balance
}

// ---------------------------------------------------------------------------
// loadScheduled — pendentes/overdue dentro do horizonte
// ---------------------------------------------------------------------------

async function loadScheduled(
  today: string,
  horizonDays: ForecastHorizon
): Promise<ScheduledTx[]> {
  const supabase = await createClient()
  const horizonEnd = addDaysIso(today, horizonDays)

  // Pega tudo que ainda não foi pago e tem due_date no horizonte (incluindo
  // overdue do passado — vamos tratá-las como "first day of forecast").
  const { data, error } = await supabase
    .from("transactions")
    .select("id, type, amount, due_date, description, status")
    .eq("status", "pending")
    .lte("due_date", horizonEnd)
    .order("due_date", { ascending: true })

  if (error || !data) {
    console.error("[forecast] scheduled query failed:", error)
    return []
  }

  return data.map((row) => ({
    id: row.id as string,
    type: row.type as "income" | "expense",
    amount: Number(row.amount),
    dueDate: row.due_date as string,
    description: (row.description as string | null) ?? null,
    status: (row.due_date as string) < today ? "overdue" : "pending",
  }))
}

// ---------------------------------------------------------------------------
// loadHistoricalIncomeMedian — mediana mensal dos últimos 6 meses
// ---------------------------------------------------------------------------

async function loadHistoricalIncomeMedian(today: string): Promise<number> {
  const supabase = await createClient()
  const cutoffDate = addDaysIso(today, -180)
  const cutoffTs = `${cutoffDate}T00:00:00-03:00`
  const currentMonth = today.slice(0, 7)

  const { data, error } = await supabase
    .from("transactions")
    .select("amount, paid_at")
    .eq("type", "income")
    .eq("status", "paid")
    .gte("paid_at", cutoffTs)
    .not("paid_at", "is", null)

  if (error || !data || data.length === 0) return 0

  // Agrupa por mês calendário BR; exclui mês atual (incompleto) pra não inflar
  // após importação OFX concentrada no mês corrente.
  const byMonth = new Map<string, number>()
  for (const row of data) {
    const ts = row.paid_at as string
    const localDate = utcToLocalDateBR(ts)
    const month = localDate.slice(0, 7)
    if (month === currentMonth) continue
    byMonth.set(month, (byMonth.get(month) ?? 0) + Number(row.amount))
  }

  const totals = [...byMonth.values()].sort((a, b) => a - b)
  if (totals.length === 0) return 0

  const mid = Math.floor(totals.length / 2)
  return totals.length % 2 === 0
    ? (totals[mid - 1] + totals[mid]) / 2
    : totals[mid]
}

// ---------------------------------------------------------------------------
// loadRecurringTemplates — adapta o detector de recorrentes
// ---------------------------------------------------------------------------

async function loadRecurringTemplates(): Promise<RecurringTemplate[]> {
  const recurring = await detectRecurringExpenses()
  return recurring
    .filter((r) => !r.possiblyCanceled)
    .map((r) => ({
      fingerprint: r.fingerprint,
      label: r.sampleDescription,
      monthlyAmount: r.monthlyAmount,
      lastSeen: r.lastSeen,
    }))
}

const getCachedOpeningBalance = cache(computeOpeningBalance)
const getCachedHistoricalIncomeMedian = cache(loadHistoricalIncomeMedian)
const getCachedRecurringTemplates = cache(loadRecurringTemplates)

// ---------------------------------------------------------------------------
// Orquestrador
// ---------------------------------------------------------------------------

/**
 * Carrega o input bruto do engine (saldo, scheduled, recorrentes, mediana).
 * Útil para o simulador "e se?", que pega o baseline e aplica ajustes.
 */
export const loadForecastEngineInput = cache(async (
  horizonDays: ForecastHorizon = 30
): Promise<ForecastEngineInput> => {
  const today = todayLocalBR()

  const [openingBalance, scheduled, recurring, historicalIncomeMedian] =
    await Promise.all([
      getCachedOpeningBalance(),
      loadScheduled(today, horizonDays),
      getCachedRecurringTemplates(),
      getCachedHistoricalIncomeMedian(today),
    ])

  return {
    openingBalance,
    today,
    horizonDays,
    scheduled,
    recurring,
    historicalIncomeMedian,
  }
})

/**
 * Carrega tudo e já roda o engine — atalho para Server Components.
 */
export const computeForecastForTenant = cache(async (
  horizonDays: ForecastHorizon = 30
): Promise<ForecastSeries> => {
  const input = await loadForecastEngineInput(horizonDays)
  return computeForecast(input)
})

/** Conta tem algum lançamento (qualquer status). */
export const tenantHasTransactions = cache(async (): Promise<boolean> => {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })

  if (error) {
    console.error("[forecast] tenantHasTransactions failed:", error)
    return false
  }
  return (count ?? 0) > 0
})

// ---------------------------------------------------------------------------
// Helpers locais (mesmos do engine — duplicação intencional pra evitar
// dependência circular e manter o engine 100% puro)
// ---------------------------------------------------------------------------

function addDaysIso(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}
