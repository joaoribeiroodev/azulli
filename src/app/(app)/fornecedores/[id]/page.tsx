import { Suspense } from "react"
import { notFound } from "next/navigation"

import { Skeleton } from "@/components/ui/skeleton"
import {
  getSupplierDetails,
  listTransactionsBySupplier,
  getMonthlySeriesByParty,
  getCustomersLite,
  getSuppliersLite,
  getCategoriesUsed,
} from "@/lib/financial/queries"
import { getProductsLite } from "@/lib/products/queries"

import { BackLink } from "@/components/app/back-link"
import { PartyTransactionActions } from "@/components/app/party-transaction-actions"

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

  const [initialSeries, partyData] = await Promise.all([
    getMonthlySeriesByParty(supplier.id, "supplier", 6),
    Promise.all([
      getCustomersLite(),
      getSuppliersLite(),
      getProductsLite(),
      getCategoriesUsed("income"),
      getCategoriesUsed("expense"),
    ]),
  ])

  const [
    customers,
    suppliers,
    products,
    incomeCategories,
    expenseCategories,
  ] = partyData

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <BackLink href="/fornecedores">Voltar para fornecedores</BackLink>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <SupplierHeader supplier={supplier} />
        <PartyTransactionActions
          customers={customers}
          suppliers={suppliers}
          products={products}
          recentIncomeCategories={incomeCategories.map((c) => c.category)}
          recentExpenseCategories={expenseCategories.map((c) => c.category)}
          defaultSupplierId={supplier.id}
          showIncome={false}
          showExpense
        />
      </div>

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
              customers={customers}
              suppliers={suppliers}
              products={products}
              recentIncomeCategories={incomeCategories.map((c) => c.category)}
              recentExpenseCategories={expenseCategories.map((c) => c.category)}
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
  customers,
  suppliers,
  products,
  recentIncomeCategories,
  recentExpenseCategories,
}: {
  supplierId: string
  supplierName: string
  page: number
  customers: Awaited<ReturnType<typeof getCustomersLite>>
  suppliers: Awaited<ReturnType<typeof getSuppliersLite>>
  products: Awaited<ReturnType<typeof getProductsLite>>
  recentIncomeCategories: string[]
  recentExpenseCategories: string[]
}) {
  const result = await listTransactionsBySupplier(supplierId, page)
  return (
    <SupplierTransactions
      supplierId={supplierId}
      supplierName={supplierName}
      result={result}
      customers={customers}
      suppliers={suppliers}
      products={products}
      recentIncomeCategories={recentIncomeCategories}
      recentExpenseCategories={recentExpenseCategories}
    />
  )
}
