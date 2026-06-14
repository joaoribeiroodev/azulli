"use server"

import { getAggregateMonthlySeries } from "@/lib/financial/aggregate-queries"
import type { MonthlyBucket } from "@/lib/financial/queries"

export async function fetchAggregateMonthlySeriesAction(
  scope: "customers" | "suppliers" | "products",
  months: 3 | 6 | 12
): Promise<MonthlyBucket[]> {
  return getAggregateMonthlySeries(scope, months)
}
