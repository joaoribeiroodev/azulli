import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { env } from "@/lib/env"

import { buildUnsubscribeUrl } from "./unsubscribe-token"
import type {
  WeeklyInsightAlert,
  WeeklyInsightCard,
  WeeklyInsightPayload,
} from "./types"

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

export type WeeklyInsightInput = {
  tenantId: string
  userId: string
  userEmail: string
  userName: string
  tenantName: string
  /** Base URL absoluta do app (sem trailing slash). Default: env.NEXT_PUBLIC_APP_URL. */
  appBaseUrl?: string
  /** Data de referência (default: agora). Útil pra testes determinísticos. */
  now?: Date
}

// ---------------------------------------------------------------------------
// Função principal
// ---------------------------------------------------------------------------

export async function buildWeeklyInsightPayload(
  input: WeeklyInsightInput
): Promise<WeeklyInsightPayload> {
  const supabase = createServiceRoleClient()
  const baseUrl = input.appBaseUrl ?? env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
  const now = input.now ?? new Date()

  const thisWeek = lastClosedWeek(now)
  const prevWeek = previousWeek(thisWeek)

  // --- Carrega transações pagas das 2 últimas semanas + pendentes/overdue ---
  const [paidLast2Weeks, pending, recurring] = await Promise.all([
    loadPaidInRange(
      supabase,
      input.tenantId,
      prevWeek.startIso,
      thisWeek.endIso
    ),
    loadPending(supabase, input.tenantId, todayIso(now)),
    loadRecurringSummary(supabase, input.tenantId, todayIso(now)),
  ])

  // --- Sumariza receita/despesa por semana ---
  const thisStats = summarizeWeek(paidLast2Weeks, thisWeek)
  const prevStats = summarizeWeek(paidLast2Weeks, prevWeek)

  // --- Constrói cards ---
  const cards = buildCards({
    thisStats,
    prevStats,
    pending,
    recurring,
  })

  // --- Constrói alerta principal ---
  const primaryAlert = pickPrimaryAlert({
    pending,
    thisStats,
    prevStats,
    todayIsoDate: todayIso(now),
    baseUrl,
  })

  // --- URLs ---
  const utm =
    "utm_source=email&utm_medium=weekly_insights&utm_campaign=insights"

  return {
    greetingName: input.userName,
    tenantName: input.tenantName,

    weekRangeLabel: humanWeekRange(thisWeek.startIso, thisWeek.endIso),
    weekStartIso: thisWeek.startIso,
    weekEndIso: thisWeek.endIso,

    cards,
    primaryAlert,

    appUrl: `${baseUrl}/dashboard?${utm}`,
    unsubscribeUrl: buildUnsubscribeUrl(baseUrl, {
      userId: input.userId,
      tenantId: input.tenantId,
      kind: "weekly_insights",
    }),
  }
}

// ---------------------------------------------------------------------------
// Loaders
// ---------------------------------------------------------------------------

type PaidTx = {
  type: "income" | "expense"
  amount: number
  paid_at: string
  description: string | null
}

type PendingTx = {
  id: string
  type: "income" | "expense"
  amount: number
  due_date: string
  description: string | null
}

async function loadPaidInRange(
  supabase: SupabaseClient,
  tenantId: string,
  startIso: string,
  endIso: string
): Promise<PaidTx[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("type, amount, paid_at, description")
    .eq("tenant_id", tenantId)
    .eq("status", "paid")
    .not("paid_at", "is", null)
    .gte("paid_at", `${startIso}T00:00:00.000Z`)
    .lt("paid_at", `${endIso}T23:59:59.999Z`)

  if (error || !data) {
    if (error) console.error("[insights] loadPaidInRange failed:", error)
    return []
  }
  return data.map((row) => ({
    type: row.type as "income" | "expense",
    amount: Number(row.amount),
    paid_at: row.paid_at as string,
    description: (row.description as string | null) ?? null,
  }))
}

async function loadPending(
  supabase: SupabaseClient,
  tenantId: string,
  todayIsoDate: string
): Promise<PendingTx[]> {
  const horizon = addDaysIso(todayIsoDate, 30)
  const { data, error } = await supabase
    .from("transactions")
    .select("id, type, amount, due_date, description")
    .eq("tenant_id", tenantId)
    .eq("status", "pending")
    .lte("due_date", horizon)
    .order("due_date", { ascending: true })

  if (error || !data) {
    if (error) console.error("[insights] loadPending failed:", error)
    return []
  }
  return data.map((row) => ({
    id: row.id as string,
    type: row.type as "income" | "expense",
    amount: Number(row.amount),
    due_date: row.due_date as string,
    description: (row.description as string | null) ?? null,
  }))
}

type RecurringSummary = {
  count: number
  monthlyTotal: number
  topLabel: string | null
  topAmount: number
}

async function loadRecurringSummary(
  supabase: SupabaseClient,
  tenantId: string,
  todayIsoDate: string
): Promise<RecurringSummary> {
  // Versão simplificada: só conta despesas com recurring_group preenchido
  // nos últimos 60 dias (já marcadas pelo OFX import / detector).
  const cutoff = addDaysIso(todayIsoDate, -60)
  const { data, error } = await supabase
    .from("transactions")
    .select("amount, description, recurring_group")
    .eq("tenant_id", tenantId)
    .eq("type", "expense")
    .eq("status", "paid")
    .not("recurring_group", "is", null)
    .gte("due_date", cutoff)

  if (error || !data || data.length === 0) {
    if (error) console.error("[insights] loadRecurringSummary failed:", error)
    return { count: 0, monthlyTotal: 0, topLabel: null, topAmount: 0 }
  }

  // Mediana por grupo
  const byGroup = new Map<string, { amounts: number[]; label: string }>()
  for (const row of data) {
    const g = row.recurring_group as string
    const arr = byGroup.get(g) ?? {
      amounts: [],
      label: (row.description as string) ?? g,
    }
    arr.amounts.push(Number(row.amount))
    byGroup.set(g, arr)
  }

  let monthlyTotal = 0
  let topLabel: string | null = null
  let topAmount = 0
  for (const { amounts, label } of byGroup.values()) {
    const med = median(amounts)
    monthlyTotal += med
    if (med > topAmount) {
      topAmount = med
      topLabel = label
    }
  }

  return {
    count: byGroup.size,
    monthlyTotal,
    topLabel,
    topAmount,
  }
}

// ---------------------------------------------------------------------------
// Sumarizadores
// ---------------------------------------------------------------------------

type WeekStats = {
  income: number
  expense: number
  profit: number
  count: number
}

function summarizeWeek(
  txs: PaidTx[],
  week: { startIso: string; endIso: string }
): WeekStats {
  let income = 0
  let expense = 0
  let count = 0
  for (const tx of txs) {
    const day = tx.paid_at.slice(0, 10)
    if (day < week.startIso || day > week.endIso) continue
    count++
    if (tx.type === "income") income += tx.amount
    else expense += tx.amount
  }
  return { income, expense, profit: income - expense, count }
}

// ---------------------------------------------------------------------------
// Construção dos cards
// ---------------------------------------------------------------------------

function buildCards(args: {
  thisStats: WeekStats
  prevStats: WeekStats
  pending: PendingTx[]
  recurring: RecurringSummary
}): WeeklyInsightCard[] {
  const { thisStats, prevStats, pending, recurring } = args

  // Empty state: nada de movimentação na semana → cards alternativos
  if (thisStats.count === 0 && prevStats.count === 0) {
    return buildEmptyStateCards(pending, recurring)
  }

  return [
    {
      label: "Receita da semana",
      value: formatBRL(thisStats.income),
      trend: makeTrend(thisStats.income, prevStats.income, true),
      description: countLabel(thisStats.count, "lançamento", "lançamentos"),
    },
    {
      label: "Despesas da semana",
      value: formatBRL(thisStats.expense),
      trend: makeTrend(thisStats.expense, prevStats.expense, false),
      description: recurring.count
        ? `Inclui ${recurring.count} ${
            recurring.count === 1 ? "recorrente" : "recorrentes"
          } (${formatBRL(recurring.monthlyTotal)}/mês)`
        : undefined,
    },
    {
      label: "Lucro líquido",
      value: formatBRL(thisStats.profit),
      trend: makeTrend(thisStats.profit, prevStats.profit, true),
      description:
        thisStats.profit < 0
          ? "Você gastou mais do que entrou."
          : undefined,
    },
  ]
}

function buildEmptyStateCards(
  pending: PendingTx[],
  recurring: RecurringSummary
): WeeklyInsightCard[] {
  const next7Days = pending.slice(0, 7)
  const upcomingTotal = next7Days.reduce(
    (sum, p) => sum + (p.type === "income" ? p.amount : -p.amount),
    0
  )

  const next = pending[0] ?? null

  return [
    {
      label: "Pendentes em aberto",
      value: pending.length.toString(),
      description:
        pending.length > 0
          ? `${formatBRL(
              pending.reduce((s, p) => s + p.amount, 0)
            )} entre os próximos 30 dias`
          : "Cadastre lançamentos a vencer pra acompanhar.",
    },
    {
      label: "Recorrentes detectadas",
      value: recurring.count.toString(),
      description: recurring.topLabel
        ? `Maior: ${recurring.topLabel} — ${formatBRL(recurring.topAmount)}/mês`
        : "Nada detectado ainda. Importe seu extrato (OFX) pra ajudar.",
    },
    {
      label: "Próximo vencimento",
      value: next ? formatBRL(next.amount) : "—",
      description: next
        ? `${truncate(next.description ?? "Sem descrição", 32)} · ${formatBRDate(
            next.due_date
          )}`
        : `Saldo previsto líquido em 7 dias: ${formatBRL(upcomingTotal)}`,
    },
  ]
}

function makeTrend(
  curr: number,
  prev: number,
  upIsGood: boolean
): WeeklyInsightCard["trend"] | undefined {
  if (prev === 0 && curr === 0) return undefined
  if (prev === 0) {
    return {
      direction: curr > 0 ? "up" : curr < 0 ? "down" : "flat",
      label: "primeira semana com movimento",
      upIsGood,
    }
  }

  const diff = curr - prev
  const pct = (diff / Math.abs(prev)) * 100
  const direction =
    Math.abs(pct) < 1 ? "flat" : pct > 0 ? "up" : "down"

  if (direction === "flat") {
    return { direction, label: "estável vs semana anterior", upIsGood }
  }
  return {
    direction,
    label: `${pct > 0 ? "+" : ""}${pct.toFixed(0)}% vs semana anterior`,
    upIsGood,
  }
}

// ---------------------------------------------------------------------------
// Alerta principal — heurísticas locais (sem chamar o forecast completo)
// ---------------------------------------------------------------------------

function pickPrimaryAlert(args: {
  pending: PendingTx[]
  thisStats: WeekStats
  prevStats: WeekStats
  todayIsoDate: string
  baseUrl: string
}): WeeklyInsightAlert | null {
  const { pending, thisStats, prevStats, todayIsoDate, baseUrl } = args

  // 1) Overdue (mais grave) → critical
  const overdue = pending.filter((p) => p.due_date < todayIsoDate)
  if (overdue.length > 0) {
    const totalOverdue = overdue.reduce((s, p) => s + p.amount, 0)
    return {
      severity: "critical",
      title: `${overdue.length} ${
        overdue.length === 1 ? "lançamento vencido" : "lançamentos vencidos"
      }`,
      message: `${formatBRL(totalOverdue)} ${
        overdue.length === 1 ? "está atrasado" : "estão atrasados"
      }. Regularize pra evitar bola de neve.`,
      cta: {
        label: "Ver vencidos",
        href: `${baseUrl}/lancamentos?status=overdue`,
      },
    }
  }

  // 2) Receita caiu drasticamente → warning
  if (
    prevStats.income > 0 &&
    thisStats.income < prevStats.income * 0.7 &&
    prevStats.income > 500
  ) {
    const drop = prevStats.income - thisStats.income
    const pct = Math.round((drop / prevStats.income) * 100)
    return {
      severity: "warning",
      title: `Receita caiu ${pct}% essa semana`,
      message: `Você recebeu ${formatBRL(
        thisStats.income
      )} contra ${formatBRL(
        prevStats.income
      )} na semana passada. Vale revisar o que mudou.`,
      cta: {
        label: "Ver lançamentos",
        href: `${baseUrl}/lancamentos`,
      },
    }
  }

  // 3) Próxima despesa grande nos próximos 7 dias → info
  const upcoming = pending
    .filter((p) => p.type === "expense" && p.due_date <= addDaysIso(todayIsoDate, 7))
    .sort((a, b) => b.amount - a.amount)
  if (upcoming.length > 0 && upcoming[0].amount >= 500) {
    const top = upcoming[0]
    return {
      severity: "info",
      title: `Despesa de ${formatBRL(top.amount)} nos próximos dias`,
      message: `${truncate(top.description ?? "Sem descrição", 60)} vence em ${formatBRDate(
        top.due_date
      )}. Confirme se está no caixa.`,
      cta: {
        label: "Ver lançamento",
        href: `${baseUrl}/lancamentos?id=${top.id}`,
      },
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// Helpers — semanas
// ---------------------------------------------------------------------------

type Week = { startIso: string; endIso: string }

/**
 * Última semana fechada (segunda → domingo).
 * Se hoje for segunda, retorna a semana que terminou ontem (domingo).
 */
function lastClosedWeek(today: Date): Week {
  const utcDay = today.getUTCDay() // 0=dom, 1=seg, ..., 6=sab
  const daysSinceLastSunday = utcDay === 0 ? 7 : utcDay
  const end = new Date(
    Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate()
    )
  )
  end.setUTCDate(end.getUTCDate() - daysSinceLastSunday)
  const start = new Date(end)
  start.setUTCDate(end.getUTCDate() - 6)
  return {
    startIso: start.toISOString().slice(0, 10),
    endIso: end.toISOString().slice(0, 10),
  }
}

function previousWeek(week: Week): Week {
  return {
    startIso: addDaysIso(week.startIso, -7),
    endIso: addDaysIso(week.endIso, -7),
  }
}

// ---------------------------------------------------------------------------
// Helpers — formatadores
// ---------------------------------------------------------------------------

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

const SHORT_MONTHS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
]

function humanWeekRange(startIso: string, endIso: string): string {
  const [, sm, sd] = startIso.split("-")
  const [, em, ed] = endIso.split("-")
  const startLabel = `${parseInt(sd)}/${SHORT_MONTHS[parseInt(sm) - 1]}`
  const endLabel = `${parseInt(ed)}/${SHORT_MONTHS[parseInt(em) - 1]}`
  return `${startLabel} a ${endLabel}`
}

function formatBRDate(iso: string): string {
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y.slice(2)}`
}

function countLabel(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural} pago${n === 1 ? "" : "s"}`
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + "…"
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

function todayIso(now: Date): string {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  )
    .toISOString()
    .slice(0, 10)
}

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}
