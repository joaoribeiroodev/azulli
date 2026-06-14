"use server"

import { getTopCustomers, getTopSuppliers } from "@/lib/financial/queries"

export type TopPartyData = {
  id: string
  name: string
  total: number
}

export async function fetchTopCustomersAction(
  range: "month" | "last30d"
): Promise<TopPartyData[]> {
  return getTopCustomers(range)
}

export async function fetchTopSuppliersAction(
  range: "month" | "last30d"
): Promise<TopPartyData[]> {
  return getTopSuppliers(range)
}
