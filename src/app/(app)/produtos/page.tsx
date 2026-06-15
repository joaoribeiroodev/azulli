import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import {
  listProductsWithStats,
  getTopProducts,
} from "@/lib/products/queries"
import { getAggregateMonthlySeries } from "@/lib/financial/aggregate-queries"

import { ProductsHeader } from "./_components/products-header"
import { ProductsTable } from "./_components/products-table"
import { TopProductsCard } from "@/components/app/top-products-card"
import { AggregateMonthlyChartCard } from "@/components/app/aggregate-monthly-chart-card"

export const metadata = { title: "Produtos — Azulli" }

export default async function ProdutosPage() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <ProductsHeader />

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
  const series = await getAggregateMonthlySeries("products", 6)
  return <AggregateMonthlyChartCard scope="products" initial={series} />
}

async function TopSection() {
  const top = await getTopProducts("month")
  return <TopProductsCard initial={top} />
}

async function TableSection() {
  const rows = await listProductsWithStats()
  return <ProductsTable rows={rows} />
}
