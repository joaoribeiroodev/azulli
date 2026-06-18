import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import {
  listCustomersWithTotals,
  getTopCustomers,
} from "@/lib/financial/queries"
import { getAggregateMonthlySeries } from "@/lib/financial/aggregate-queries"
import { CustomersHeader } from "./_components/customers-header"
import { CustomersTable } from "./_components/customers-table"
import { TopPartiesCard } from "@/components/app/top-parties-card"
import { AggregateMonthlyChartCard } from "@/components/app/aggregate-monthly-chart-card"

export const metadata = { title: "Clientes — Azulli" }

export default async function ClientesPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <CustomersHeader />

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
  const series = await getAggregateMonthlySeries("customers", 6)
  return <AggregateMonthlyChartCard scope="customers" initial={series} />
}

async function TopSection() {
  const top = await getTopCustomers("month")
  return <TopPartiesCard kind="customer" initial={top} />
}

async function TableSection() {
  const rows = await listCustomersWithTotals()
  return <CustomersTable rows={rows} />
}
