import { Suspense } from "react"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import {
  getProductDetails,
  listStockMovements,
  getMonthlySeriesByProduct,
} from "@/lib/products/queries"

import { ProductHeader } from "./_components/product-header"
import { ProductKPICards } from "./_components/product-kpi-cards"
import { ProductMonthlyChartCard } from "./_components/product-monthly-chart-card"
import { StockMovementsCard } from "./_components/stock-movements-card"

type Params = { id: string }

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}) {
  const { id } = await params
  const product = await getProductDetails(id)
  return {
    title: product ? `${product.name} — Azulli` : "Produto — Azulli",
  }
}

export default async function ProdutoDetalhePage({
  params,
}: {
  params: Promise<Params>
}) {
  const { id } = await params

  const product = await getProductDetails(id)
  if (!product) notFound()

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <Link
        href="/produtos"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Voltar para produtos
      </Link>

      <ProductHeader product={product} />

      <ProductKPICards product={product} />

      <Suspense fallback={<Skeleton className="h-72" />}>
        <ChartSection productId={product.id} />
      </Suspense>

      {product.track_stock && (
        <Suspense fallback={<Skeleton className="h-72" />}>
          <MovementsSection productId={product.id} unit={product.unit} />
        </Suspense>
      )}
    </div>
  )
}

async function ChartSection({ productId }: { productId: string }) {
  const series = await getMonthlySeriesByProduct(productId, 6)
  return <ProductMonthlyChartCard productId={productId} initial={series} />
}

async function MovementsSection({
  productId,
  unit,
}: {
  productId: string
  unit: string
}) {
  const movements = await listStockMovements(productId, 30)
  return <StockMovementsCard movements={movements} unit={unit} />
}
