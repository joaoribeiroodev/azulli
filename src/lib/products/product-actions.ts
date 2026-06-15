"use server"

import {
  getMonthlySeriesByProduct,
  getTopProducts,
  type TopProduct,
} from "@/lib/products/queries"
import type { MonthlyBucket } from "@/lib/financial/queries"

export async function fetchProductMonthlySeriesAction(
  productId: string,
  months: 3 | 6 | 12
): Promise<MonthlyBucket[]> {
  return getMonthlySeriesByProduct(productId, months)
}

export async function fetchTopProductsAction(
  range: "month" | "last30d"
): Promise<TopProduct[]> {
  return getTopProducts(range)
}
