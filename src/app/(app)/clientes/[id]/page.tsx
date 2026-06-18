import { Suspense } from "react"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import {
  getCustomerDetails,
  listTransactionsByCustomer,
  getMonthlySeriesByParty,
} from "@/lib/financial/queries"

import { CustomerHeader } from "./_components/customer-header"
import { CustomerCollectionAction } from "./_components/customer-collection-action"
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

  const initialSeries = await getMonthlySeriesByParty(customer.id, "customer", 6)

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <Link
        href="/clientes"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Voltar para clientes
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <CustomerHeader customer={customer} />
        <Suspense fallback={null}>
          <CustomerCollectionAction customer={customer} />
        </Suspense>
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
}: {
  customerId: string
  customerName: string
  page: number
}) {
  const result = await listTransactionsByCustomer(customerId, page)
  return (
    <CustomerTransactions
      customerId={customerId}
      customerName={customerName}
      result={result}
    />
  )
}
