import { Suspense } from "react"
import { ArrowDownRight, ArrowUpRight, TrendingUp, AlertCircle } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

import {
  getDashboardSummary,
  getLast7DaysSeries,
  getRecentTransactions,
  getCustomersLite,
  getSuppliersLite,
  getCategoriesUsed,
} from "@/lib/financial/queries"
import { formatBRL } from "@/lib/utils/currency"

import { WeeklyChart } from "./_components/weekly-chart"
import { RecentTransactionsList } from "./_components/recent-transactions"
import { QuickActions } from "./_components/quick-actions"
import { CompleteCompanyBanner } from "./_components/complete-company-banner"
import { TopOfMonthCards } from "./_components/top-of-month"

export const metadata = { title: "Dashboard — Azulli" }

export default async function DashboardPage() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <Suspense fallback={null}>
        <CompleteCompanyBanner />
      </Suspense>

      <Suspense fallback={<HeaderSkeleton />}>
        <HeaderWithParties />
      </Suspense>

      <Suspense fallback={<CardsSkeleton />}>
        <SummaryCards />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-28" />}>
        <TopOfMonthCards />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Suspense fallback={<Skeleton className="h-80 lg:col-span-2" />}>
          <WeeklyChartWrapper />
        </Suspense>

        <Suspense fallback={<Skeleton className="h-80" />}>
          <RecentTransactionsWrapper />
        </Suspense>
      </div>
    </div>
  )
}

async function HeaderWithParties() {
  const [customers, suppliers, categories] = await Promise.all([
    getCustomersLite(),
    getSuppliersLite(),
    getCategoriesUsed(),
  ])

  return (
    <header className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-brand-ink">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visão rápida do seu mês.
        </p>
      </div>
      <QuickActions
        customers={customers}
        suppliers={suppliers}
        recentCategories={categories.map((c) => c.category)}
      />
    </header>
  )
}

async function SummaryCards() {
  const s = await getDashboardSummary()
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Entradas do mês</CardDescription>
          <CardTitle className="text-2xl font-display flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5 text-success" />
            {formatBRL(s.income)}
          </CardTitle>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Saídas do mês</CardDescription>
          <CardTitle className="text-2xl font-display flex items-center gap-2">
            <ArrowDownRight className="h-5 w-5 text-destructive" />
            {formatBRL(s.expense)}
          </CardTitle>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Lucro líquido</CardDescription>
          <CardTitle
            className={`text-2xl font-display flex items-center gap-2 ${
              s.profit >= 0 ? "text-success-ink" : "text-destructive"
            }`}
          >
            <TrendingUp className="h-5 w-5" />
            {formatBRL(s.profit)}
          </CardTitle>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Pendências</CardDescription>
          <CardTitle className="text-2xl font-display flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            {s.pendingCount}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">
            {formatBRL(s.pendingAmount)} a receber/pagar
            {s.overdueCount > 0 && (
              <>
                {" · "}
                <span className="text-destructive font-medium">
                  {s.overdueCount} vencidas
                </span>
              </>
            )}
          </p>
        </CardContent>
      </Card>
    </section>
  )
}

async function WeeklyChartWrapper() {
  const data = await getLast7DaysSeries()
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-base">Últimos 7 dias</CardTitle>
        <CardDescription>Entradas e saídas pagas no período</CardDescription>
      </CardHeader>
      <CardContent>
        <WeeklyChart data={data} />
      </CardContent>
    </Card>
  )
}

async function RecentTransactionsWrapper() {
  const transactions = await getRecentTransactions(6)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Movimentações recentes</CardTitle>
        <CardDescription>Últimos lançamentos</CardDescription>
      </CardHeader>
      <CardContent>
        <RecentTransactionsList transactions={transactions} />
      </CardContent>
    </Card>
  )
}

function HeaderSkeleton() {
  return (
    <header className="flex items-start justify-between gap-4 flex-wrap">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
    </header>
  )
}

function CardsSkeleton() {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-28" />
      ))}
    </section>
  )
}
