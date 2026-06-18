type TransactionStatusFilter = "pending" | "paid" | "overdue" | "all" | undefined

type QueryWithFilters = {
  gte: (col: string, val: string) => QueryWithFilters
  lte: (col: string, val: string) => QueryWithFilters
  or: (filters: string) => QueryWithFilters
}

/**
 * Filtra por data de referência: pagos usam paid_at; pendentes/vencidos usam due_date.
 */
export function applyTransactionDateRange<T extends QueryWithFilters>(
  query: T,
  from?: string,
  to?: string,
  status?: TransactionStatusFilter
): T {
  if (!from && !to) return query

  if (status === "paid") {
    let q = query
    if (from) q = q.gte("paid_at", `${from}T00:00:00-03:00`) as T
    if (to) q = q.lte("paid_at", `${to}T23:59:59-03:00`) as T
    return q
  }

  if (status === "pending" || status === "overdue") {
    let q = query
    if (from) q = q.gte("due_date", from) as T
    if (to) q = q.lte("due_date", to) as T
    return q
  }

  const parts: string[] = []
  if (from && to) {
    parts.push(
      `and(raw_status.eq.paid,paid_at.gte.${from}T00:00:00-03:00,paid_at.lte.${to}T23:59:59-03:00)`
    )
    parts.push(`and(raw_status.eq.pending,due_date.gte.${from},due_date.lte.${to})`)
  } else if (from) {
    parts.push(`and(raw_status.eq.paid,paid_at.gte.${from}T00:00:00-03:00)`)
    parts.push(`and(raw_status.eq.pending,due_date.gte.${from})`)
  } else if (to) {
    parts.push(`and(raw_status.eq.paid,paid_at.lte.${to}T23:59:59-03:00)`)
    parts.push(`and(raw_status.eq.pending,due_date.lte.${to})`)
  }

  if (parts.length > 0) {
    return query.or(parts.join(",")) as T
  }
  return query
}
