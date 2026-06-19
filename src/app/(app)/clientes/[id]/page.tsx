import { Suspense } from "react"
import { notFound } from "next/navigation"

import { Skeleton } from "@/components/ui/skeleton"
import {
  getCustomerDetails,
  listTransactionsByCustomer,
  getMonthlySeriesByParty,
  getCustomersLite,
  getSuppliersLite,
  getCategoriesUsed,
} from "@/lib/financial/queries"
import { getProductsLite } from "@/lib/products/queries"

import { BackLink } from "@/components/app/back-link"

import { CustomerHeader } from "./_components/customer-header"
import { CustomerCollectionAction } from "./_components/customer-collection-action"
import { PartyTransactionActions } from "@/components/app/party-transaction-actions"
import { CustomerKPICards } from "./_components/customer-kpi-cards"
import { CustomerContactCard } from "./_components/customer-contact-card"
import { CustomerTransactions } from "./_components/customer-transactions"
import { MonthlyChartCard } from "@/components/app/monthly-chart-card"

type Params = { id: string }
type SP = { page?: string }

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}) {
  const { id } = await params
  const customer = await getCustomerDetails(id)
  return {
    title: customer ? `${customer.name} — Azulli` : "Cliente — Azulli",
  }
}

export default async function ClienteDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<Params>
  searchParams: Promise<SP>
}) {
  const { id } = await params
  const sp = await searchParams

  const customer = await getCustomerDetails(id)
  if (!customer) notFound()

  const [initialSeries, partyData] = await Promise.all([
    getMonthlySeriesByParty(customer.id, "customer", 6),
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
      <BackLink href="/clientes">Voltar para clientes</BackLink>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <CustomerHeader customer={customer} />
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:items-center">
          <PartyTransactionActions
            customers={customers}
            suppliers={suppliers}
            products={products}
            recentIncomeCategories={incomeCategories.map((c) => c.category)}
            recentExpenseCategories={expenseCategories.map((c) => c.category)}
            defaultCustomerId={customer.id}
            showIncome
            showExpense={false}
          />
          <Suspense fallback={null}>
            <CustomerCollectionAction customer={customer} />
          </Suspense>
        </div>
      </div>

      <CustomerKPICards kpis={customer.kpis} />

      <MonthlyChartCard
        partyId={customer.id}
        partyType="customer"
        initial={initialSeries}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Suspense
            key={JSON.stringify(sp)}
            fallback={<Skeleton className="h-96" />}
          >
            <TransactionsSection
              customerId={customer.id}
              customerName={customer.name}
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
          <CustomerContactCard customer={customer} />
        </div>
      </div>
    </div>
  )
}

async function TransactionsSection({
  customerId,
  customerName,
  page,
  customers,
  suppliers,
  products,
  recentIncomeCategories,
  recentExpenseCategories,
}: {
  customerId: string
  customerName: string
  page: number
  customers: Awaited<ReturnType<typeof getCustomersLite>>
  suppliers: Awaited<ReturnType<typeof getSuppliersLite>>
  products: Awaited<ReturnType<typeof getProductsLite>>
  recentIncomeCategories: string[]
  recentExpenseCategories: string[]
}) {
  const result = await listTransactionsByCustomer(customerId, page)
  return (
    <CustomerTransactions
      customerId={customerId}
      customerName={customerName}
      result={result}
      customers={customers}
      suppliers={suppliers}
      products={products}
      recentIncomeCategories={recentIncomeCategories}
      recentExpenseCategories={recentExpenseCategories}
    />
  )
}
