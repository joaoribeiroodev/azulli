import { Suspense } from "react"
import Link from "next/link"

import { Skeleton } from "@/components/ui/skeleton"
import { BackLink } from "@/components/app/back-link"
import { getCurrentMembership } from "@/lib/team/queries"
import { listTransactions } from "@/lib/financial/queries"
import { AccountantExportCard } from "@/app/(app)/configuracoes/_components/accountant-export-card"
import { TransactionsTable } from "@/app/(app)/lancamentos/_components/transactions-table"
import { TransactionsPagination } from "@/app/(app)/lancamentos/_components/transactions-pagination"
import { ContadorSummaryCards } from "./_components/contador-summary-cards"
import { ContadorMonthFilter } from "./_components/contador-month-filter"
import { ContadorCompanyCard } from "./_components/contador-company-card"
import { ContadorComparisonCard } from "./_components/contador-comparison-card"
import { ContadorDreCard } from "./_components/contador-dre-card"
import { ContadorPendingPanel } from "./_components/contador-pending-panel"
import { ContadorMonthlyChartSection } from "./_components/contador-monthly-chart-section"
import { ContadorTransactionFilters } from "./_components/contador-transaction-filters"

export const metadata = { title: "Contador — Azulli" }

type SP = {
  page?: string
  month?: string
  type?: string
  status?: string
}

export default async function ContadorPage({
  searchParams,
}: {
  searchParams: Promise<SP>
}) {
  const membership = await getCurrentMembership()
  const sp = await searchParams
  const filterKey = JSON.stringify(sp)

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <header className="space-y-1">
        <BackLink href="/dashboard" className="mb-2">
          Voltar ao painel
        </BackLink>
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-brand-ink">
          Área do contador
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Visão read-only: dados da empresa, DRE, comparativos, pendências,
          exportações e lançamentos.{" "}
          {membership?.role === "owner" && (
            <Link
              href="/configuracoes?tab=contador"
              className="text-brand hover:underline underline-offset-4"
            >
              Gerenciar acessos →
            </Link>
          )}
        </p>
      </header>

      <Suspense fallback={<Skeleton className="h-32" />}>
        <ContadorCompanyCard />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-28" />} key={`sum-${filterKey}`}>
        <ContadorSummaryCards month={sp.month} />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-40" />} key={`cmp-${filterKey}`}>
        <ContadorComparisonCard month={sp.month} />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Suspense fallback={<Skeleton className="h-80" />}>
          <ContadorMonthlyChartSection />
        </Suspense>
        <Suspense fallback={<Skeleton className="h-80" />} key={`dre-${filterKey}`}>
          <ContadorDreCard month={sp.month} />
        </Suspense>
      </div>

      <Suspense fallback={<Skeleton className="h-48" />}>
        <ContadorPendingPanel />
      </Suspense>

      <AccountantExportCard month={sp.month} />

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <Suspense fallback={<Skeleton className="h-10 w-64" />}>
          <ContadorMonthFilter />
        </Suspense>
        <Suspense fallback={null}>
          <ContadorTransactionFilters />
        </Suspense>
      </div>

      <Suspense key={filterKey} fallback={<Skeleton className="h-96" />}>
        <TransactionsSection sp={sp} />
      </Suspense>
    </div>
  )
}

async function TransactionsSection({ sp }: { sp: SP }) {
  let from: string | undefined
  let to: string | undefined
  if (sp.month && /^\d{4}-\d{2}$/.test(sp.month)) {
    const [y, m] = sp.month.split("-").map(Number)
    const lastDay = new Date(y, m, 0).getDate()
    from = `${sp.month}-01`
    to = `${sp.month}-${String(lastDay).padStart(2, "0")}`
  }

  const result = await listTransactions({
    type: (sp.type as "income" | "expense" | "all") ?? "all",
    status: (sp.status as "pending" | "paid" | "overdue" | "all") ?? "all",
    from,
    to,
    page: sp.page ? parseInt(sp.page, 10) : 1,
    pageSize: 20,
  })

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-brand-ink">
        Lançamentos
        {result.total > 0 && (
          <span className="text-muted-foreground font-normal">
            {" "}
            · {result.total} registro{result.total === 1 ? "" : "s"}
          </span>
        )}
      </h2>
      <TransactionsTable rows={result.rows} readOnly />
      <TransactionsPagination
        page={result.page}
        totalPages={result.totalPages}
        total={result.total}
        basePath="/contador"
      />
    </div>
  )
}
