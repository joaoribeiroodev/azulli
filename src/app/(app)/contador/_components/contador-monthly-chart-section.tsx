import { getAccountantMonthlyTrend } from "@/lib/accountant/queries"
import { ContadorMonthlyChart } from "./contador-monthly-chart"

export async function ContadorMonthlyChartSection() {
  const buckets = await getAccountantMonthlyTrend(6)
  return <ContadorMonthlyChart buckets={buckets} />
}
