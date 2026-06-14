"use server"

import {
  getMonthlySeriesByParty,
  type MonthlyBucket,
} from "@/lib/financial/queries"

export async function fetchMonthlySeriesAction(
  partyId: string,
  partyType: "customer" | "supplier",
  months: 3 | 6 | 12
): Promise<MonthlyBucket[]> {
  return getMonthlySeriesByParty(partyId, partyType, months)
}
