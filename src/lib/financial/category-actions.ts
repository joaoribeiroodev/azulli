"use server"

import { createClient } from "@/lib/supabase/server"
import { getCurrentMonthRange, getLastNDays } from "@/lib/utils/date"

export type CategorySliceData = {
  category: string
  label: string
  total: number
}

export async function fetchExpensesByCategoryAction(
  range: "month" | "last30d" = "month"
): Promise<CategorySliceData[]> {
  try {
    const supabase = await createClient()

    let from: string
    let to: string

    if (range === "month") {
      const r = getCurrentMonthRange()
      from = r.from
      to = r.to
    } else {
      const days = getLastNDays(30)
      from = `${days[0]}T00:00:00-03:00`
      to = `${days[days.length - 1]}T23:59:59-03:00`
    }

    const { data, error } = await supabase
      .from("transactions")
      .select("category, amount, paid_at")
      .eq("type", "expense")
      .eq("status", "paid")
      .not("paid_at", "is", null)
      .gte("paid_at", from)
      .lte("paid_at", to)

    if (error || !data) {
      console.error("[category-actions] fetchExpensesByCategoryAction failed:", error)
      return []
    }

    const map = new Map<string, number>()
    for (const row of data) {
      const key = row.category && row.category.trim() !== "" ? row.category : "__uncategorized"
      map.set(key, (map.get(key) ?? 0) + Number(row.amount))
    }

    const sorted = Array.from(map.entries())
      .map(([category, total]) => ({
        category,
        label: category === "__uncategorized" ? "Sem categoria" : category,
        total,
      }))
      .sort((a, b) => b.total - a.total)

    if (sorted.length <= 8) return sorted

    const top8 = sorted.slice(0, 8)
    const othersTotal = sorted.slice(8).reduce((sum, s) => sum + s.total, 0)
    top8.push({ category: "__others", label: "Outros", total: othersTotal })

    return top8
  } catch (err) {
    console.error("[category-actions] fetchExpensesByCategoryAction error:", err)
    return []
  }
}
