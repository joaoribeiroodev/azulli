import { Suspense } from "react"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import {
  getSupplierDetails,
  listTransactionsBySupplier,
  getMonthlySeriesByParty,
} from "@/lib/financial/queries"

import { SupplierHeader } from "./_components/supplier-header"
import { SupplierKPICards } from "./_components/supplier-kpi-cards"
import { SupplierContactCard } from "./_components/supplier-contact-card"
import { SupplierTransactions } from "./_components/supplier-transactions"
import { MonthlyChartCard } from "@/components/app/monthly-chart-card"

type Params = { id: string }
type SP = { page?: string }

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}) {
  const { id } = await params
  const supplier = await getSupplierDetails(id)
  return {
    title: supplier ? `${supplier.name} — Azulli` : "Fornecedor — Azulli",
  }
}

export default async function FornecedorDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<Params>
  searchParams: Promise<SP>
}) {
  const { id } = await params
  const sp = await searchParams

  const supplier = await getSupplierDetails(id)
  if (!supplier) notFound()

  const initialSeries = await getMonthlySeriesByParty(supplier.id, "supplier", 6)

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <Link
        href="/fornecedores"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Voltar para fornecedores
      </Link>

      <SupplierHeader supplier={supplier} />

      <SupplierKPICards kpis={supplier.kpis} />

      <MonthlyChartCard
        partyId={supplier.id}
        partyType="supplier"
        initial={initialSeries}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Suspense
            key={JSON.stringify(sp)}
            fallback={<Skeleton className="h-96" />}
          >
            <TransactionsSection
              supplierId={supplier.id}
              supplierName={supplier.name}
              page={sp.page ? parseInt(sp.page, 10) : 1}
            />
          </Suspense>
        </div>

        <div className="space-y-6">
          <SupplierContactCard supplier={supplier} />
        </div>
      </div>
    </div>
  )
}

async function TransactionsSection({
  supplierId,
  supplierName,
  page,
}: {
  supplierId: string
  supplierName: string
  page: number
}) {
  const result = await listTransactionsBySupplier(supplierId, page)
  return (
    <SupplierTransactions
      supplierId={supplierId}
      supplierName={supplierName}
      result={result}
    />
  )
}
