import "server-only"

import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import { getCurrentMonthRange } from "@/lib/utils/date"
import { formatBRL } from "@/lib/utils/currency"

export type HumanInsight = {
  message: string
  href?: string
  label?: string
} | null

/**
 * Insight curto comparando gastos do mês vs mês anterior (top categoria).
 */
export const getHumanInsight = cache(async (): Promise<HumanInsight> => {
  const supabase = await createClient()
  const { from, to } = getCurrentMonthRange()

  const [y, m] = from.slice(0, 7).split("-").map(Number)
  const prevMonth = m === 1 ? 12 : m - 1
  const prevYear = m === 1 ? y - 1 : y
  const prevFrom = `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`
  const prevLastDay = new Date(prevYear, prevMonth, 0).getDate()
  const prevTo = `${prevYear}-${String(prevMonth).padStart(2, "0")}-${String(prevLastDay).padStart(2, "0")}`

  const toDate = to.slice(0, 10)
  const prevFromTs = `${prevFrom}T00:00:00-03:00`
  const toTs = `${toDate}T23:59:59-03:00`

  const { data, error } = await supabase
    .from("transactions_with_status")
    .select("type, amount, status, due_date, paid_at, category")
    .eq("type", "expense")
    .eq("status", "paid")
    .or(
      `and(paid_at.gte.${prevFromTs},paid_at.lte.${toTs}),and(paid_at.is.null,due_date.gte.${prevFrom},due_date.lte.${toDate})`
    )

  if (error || !data?.length) return null

  const sumByCategory = (
    rangeFrom: string,
    rangeTo: string
  ): Map<string, number> => {
    const map = new Map<string, number>()
    for (const row of data) {
      if (row.status !== "paid") continue
      const ref = row.paid_at
        ? row.paid_at.slice(0, 10)
        : (row.due_date as string)
      if (ref < rangeFrom || ref > rangeTo) continue
      const cat = (row.category as string | null) ?? "Sem categoria"
      map.set(cat, (map.get(cat) ?? 0) + Number(row.amount))
    }
    return map
  }

  const thisMonth = sumByCategory(from.slice(0, 10), to.slice(0, 10))
  const lastMonth = sumByCategory(prevFrom, prevTo)

  let topCat = ""
  let topDelta = 0
  let topPct = 0

  for (const [cat, amount] of thisMonth) {
    const prev = lastMonth.get(cat) ?? 0
    if (prev < 50) continue
    const delta = amount - prev
    const pct = prev > 0 ? (delta / prev) * 100 : 0
    if (Math.abs(pct) > Math.abs(topPct) && Math.abs(delta) >= 30) {
      topCat = cat
      topDelta = delta
      topPct = pct
    }
  }

  if (!topCat || Math.abs(topPct) < 15) {
    const totalThis = [...thisMonth.values()].reduce((a, b) => a + b, 0)
    const totalPrev = [...lastMonth.values()].reduce((a, b) => a + b, 0)
    if (totalPrev > 100) {
      const pct = ((totalThis - totalPrev) / totalPrev) * 100
      if (Math.abs(pct) >= 10) {
        return {
          message:
            pct > 0
              ? `Despesas do mês ${pct.toFixed(0)}% acima do mês passado (${formatBRL(totalThis)} vs ${formatBRL(totalPrev)}).`
              : `Despesas do mês ${Math.abs(pct).toFixed(0)}% abaixo do mês passado — bom controle!`,
          href: "/lancamentos?type=expense",
          label: "Ver despesas",
        }
      }
    }
    return null
  }

  const dir = topPct > 0 ? "mais" : "menos"
  return {
    message: `Você gastou ${Math.abs(topPct).toFixed(0)}% ${dir} em «${topCat}» que no mês passado (${formatBRL(topDelta)} de diferença).`,
    href: "/lancamentos?type=expense",
    label: "Ver despesas",
  }
})
