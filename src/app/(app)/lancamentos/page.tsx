import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import {
  listTransactions,
  getCustomersLite,
  getSuppliersLite,
} from "@/lib/financial/queries"
import { getTenantInvoiceContext } from "@/lib/invoices/queries"
import { TransactionsHeader } from "./_components/transactions-header"
import { TransactionsTable } from "./_components/transactions-table"
import { TransactionsFilters } from "./_components/transactions-filters"
import { TransactionsPagination } from "./_components/transactions-pagination"

export const metadata = { title: "Lançamentos — Azulli" }

type SP = {
  type?: string
  status?: string
  from?: string
  to?: string
  page?: string
}

export default async function LancamentosPage({
  searchParams,
}: {
  searchParams: Promise<SP>
}) {
  const sp = await searchParams

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <Suspense fallback={null}>
        <HeaderWithParties />
      </Suspense>

      <TransactionsFilters />

      <Suspense
        key={JSON.stringify(sp)}
        fallback={<Skeleton className="h-96" />}
      >
        <TableSection sp={sp} />
      </Suspense>
    </div>
  )
}

async function HeaderWithParties() {
  const [customers, suppliers] = await Promise.all([
    getCustomersLite(),
    getSuppliersLite(),
  ])
  return <TransactionsHeader customers={customers} suppliers={suppliers} />
}

async function TableSection({ sp }: { sp: SP }) {
  const [result, ctx] = await Promise.all([
    listTransactions({
      type: (sp.type as "income" | "expense" | "all") ?? "all",
      status: (sp.status as "pending" | "paid" | "overdue" | "all") ?? "all",
      from: sp.from || undefined,
      to: sp.to || undefined,
      page: sp.page ? parseInt(sp.page, 10) : 1,
      pageSize: 20,
    }),
    getTenantInvoiceContext(),
  ])

  return (
    <div className="space-y-4">
      <TransactionsTable rows={result.rows} allowsNFe={ctx.allowsNFe} />
      <TransactionsPagination
        page={result.page}
        totalPages={result.totalPages}
        total={result.total}
      />
    </div>
  )
}
