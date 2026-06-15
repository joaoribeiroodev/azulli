import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import {
  listTransactions,
  getCustomersLite,
  getSuppliersLite,
  getCategoriesUsed,
} from "@/lib/financial/queries"
import { getProductsLite } from "@/lib/products/queries"
import { getTenantInvoiceContext } from "@/lib/invoices/queries"
import { TransactionsHeader } from "./_components/transactions-header"
import { TransactionsTable } from "./_components/transactions-table"
import { TransactionsFilters } from "./_components/transactions-filters"
import { TransactionsPagination } from "./_components/transactions-pagination"

export const metadata = { title: "Lançamentos — Azulli" }

type SP = {
  type?: string
  status?: string
  category?: string
  month?: string
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

      <Suspense fallback={<Skeleton className="h-24" />}>
        <FiltersWrapper />
      </Suspense>

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
  const [customers, suppliers, products, categories] = await Promise.all([
    getCustomersLite(),
    getSuppliersLite(),
    getProductsLite(),
    getCategoriesUsed(),
  ])
  return (
    <TransactionsHeader
      customers={customers}
      suppliers={suppliers}
      products={products}
      recentCategories={categories.map((c) => c.category)}
    />
  )
}

async function FiltersWrapper() {
  const categories = await getCategoriesUsed()
  return <TransactionsFilters categories={categories.map((c) => c.category)} />
}

function resolveDateRange(sp: SP): { from?: string; to?: string } {
  if (sp.month && /^\d{4}-\d{2}$/.test(sp.month)) {
    const [y, m] = sp.month.split("-").map(Number)
    const lastDay = new Date(y, m, 0).getDate()
    return {
      from: `${sp.month}-01`,
      to: `${sp.month}-${String(lastDay).padStart(2, "0")}`,
    }
  }
  return { from: sp.from || undefined, to: sp.to || undefined }
}

async function TableSection({ sp }: { sp: SP }) {
  const { from, to } = resolveDateRange(sp)

  const [result, ctx] = await Promise.all([
    listTransactions({
      type: (sp.type as "income" | "expense" | "all") ?? "all",
      status: (sp.status as "pending" | "paid" | "overdue" | "all") ?? "all",
      category: sp.category ?? "all",
      from,
      to,
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
