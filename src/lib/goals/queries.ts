import "server-only"
import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import { utcToLocalDateBR } from "@/lib/utils/date"
import type { GoalKind } from "@/lib/goals/schemas"

export type GoalRow = {
  id: string
  title: string
  kind: GoalKind
  target_value: number
  current_value: number   // raw do DB (só usado quando kind='custom')
  period_start: string
  period_end: string
  is_archived: boolean
  notes: string | null
  created_at: string

  // Calculados:
  progress: number        // valor atual real (calculado dinamicamente)
  progress_percent: number // 0-100+
}

export const listGoals = cache(async (opts?: {
  includeArchived?: boolean
}): Promise<GoalRow[]> => {
  const supabase = await createClient()

  let query = supabase
    .from("goals")
    .select(
      "id, title, kind, target_value, current_value, period_start, period_end, is_archived, notes, created_at"
    )
    .order("is_archived", { ascending: true })
    .order("period_end", { ascending: true })

  if (!opts?.includeArchived) {
    query = query.eq("is_archived", false)
  }

  const { data: goals, error } = await query
  if (error || !goals) return []

  if (goals.length === 0) return []

  // Buscar todas as transactions em UMA query e calcular progresso em memória
  const allDateRanges = goals.map((g) => ({
    start: g.period_start,
    end: g.period_end,
  }))
  const minStart = allDateRanges.reduce((m, r) => (r.start < m ? r.start : m), allDateRanges[0].start)
  const maxEnd = allDateRanges.reduce((m, r) => (r.end > m ? r.end : m), allDateRanges[0].end)

  const { data: transactions } = await supabase
    .from("transactions")
    .select("type, amount, paid_at")
    .eq("status", "paid")
    .not("paid_at", "is", null)
    .gte("paid_at", `${minStart}T00:00:00`)
    .lte("paid_at", `${maxEnd}T23:59:59.999`)

  const txs = transactions ?? []

  return goals.map((g) => {
    const progress = computeProgress(g.kind as GoalKind, txs, g.period_start, g.period_end, Number(g.current_value))
    const targetValue = Number(g.target_value)
    const percent = targetValue > 0 ? (progress / targetValue) * 100 : 0
    return {
      id: g.id,
      title: g.title,
      kind: g.kind as GoalKind,
      target_value: targetValue,
      current_value: Number(g.current_value),
      period_start: g.period_start,
      period_end: g.period_end,
      is_archived: g.is_archived,
      notes: g.notes,
      created_at: g.created_at,
      progress,
      progress_percent: percent,
    }
  })
})

function computeProgress(
  kind: GoalKind,
  transactions: Array<{ type: string; amount: number; paid_at: string | null }>,
  periodStart: string,
  periodEnd: string,
  customValue: number
): number {
  if (kind === "custom") return customValue

  const inPeriod = transactions.filter((t) => {
    if (!t.paid_at) return false
    const dateBR = utcToLocalDateBR(t.paid_at)
    return dateBR >= periodStart && dateBR <= periodEnd
  })

  switch (kind) {
    case "revenue":
      return inPeriod
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + Number(t.amount), 0)

    case "profit": {
      const income = inPeriod
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + Number(t.amount), 0)
      const expense = inPeriod
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + Number(t.amount), 0)
      return income - expense
    }

    case "sales_count":
      return inPeriod.filter((t) => t.type === "income").length

    default:
      return 0
  }
}

export type GoalsStats = {
  totalActive: number
  totalAchieved: number  // metas atingidas (>= 100%)
}

export async function getGoalsStats(): Promise<GoalsStats> {
  const goals = await listGoals({ includeArchived: true })
  const active = goals.filter((g) => !g.is_archived)
  return {
    totalActive: active.length,
    totalAchieved: active.filter((g) => g.progress_percent >= 100).length,
  }
}
