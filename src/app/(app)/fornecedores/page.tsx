import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import {
  listSuppliersWithTotals,
  getTopSuppliers,
} from "@/lib/financial/queries"
import { getAggregateMonthlySeries } from "@/lib/financial/aggregate-queries"
import { SuppliersHeader } from "./_components/suppliers-header"
import { SuppliersTable } from "./_components/suppliers-table"
import { TopPartiesCard } from "@/components/app/top-parties-card"
import { AggregateMonthlyChartCard } from "@/components/app/aggregate-monthly-chart-card"

export const metadata = { title: "Fornecedores — Azulli" }

export default async function FornecedoresPage() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <SuppliersHeader />

      <Suspense fallback={<Skeleton className="h-72" />}>
        <ChartSection />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-72" />}>
        <TopSection />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-96" />}>
        <TableSection />
      </Suspense>
    </div>
  )
}

async function ChartSection() {
  const series = await getAggregateMonthlySeries("suppliers", 6)
  return <AggregateMonthlyChartCard scope="suppliers" initial={series} />
}

async function TopSection() {
  const top = await getTopSuppliers("month")
  return <TopPartiesCard kind="supplier" initial={top} />
}

async function TableSection() {
  const rows = await listSuppliersWithTotals()
  return <SuppliersTable rows={rows} />
}
