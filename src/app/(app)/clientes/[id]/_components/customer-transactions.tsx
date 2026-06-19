"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"

import { TransactionsTable } from "@/app/(app)/lancamentos/_components/transactions-table"
import { PartyTransactionActions } from "@/components/app/party-transaction-actions"
import type { PaginatedTransactions } from "@/lib/financial/queries"
import type { ProductLite } from "@/lib/products/queries"

type Party = { id: string; name: string }

type Props = {
  customerId: string
  customerName: string
  result: PaginatedTransactions
  customers: Party[]
  suppliers: Party[]
  products: ProductLite[]
  recentIncomeCategories: string[]
  recentExpenseCategories: string[]
}

export function CustomerTransactions({
  customerId,
  result,
  customers,
  suppliers,
  products,
  recentIncomeCategories,
  recentExpenseCategories,
}: Props) {
  const router = useRouter()
  const sp = useSearchParams()

  function goPage(newPage: number) {
    const params = new URLSearchParams(sp.toString())
    if (newPage <= 1) params.delete("page")
    else params.set("page", String(newPage))
    router.push(`?${params.toString()}`)
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-base">Histórico de lançamentos</CardTitle>
          <CardDescription>
            {result.total === 0
              ? "Sem movimentações ainda"
              : `${result.total} ${
                  result.total === 1 ? "lançamento" : "lançamentos"
                }`}
          </CardDescription>
        </div>
        <PartyTransactionActions
          customers={customers}
          suppliers={suppliers}
          products={products}
          recentIncomeCategories={recentIncomeCategories}
          recentExpenseCategories={recentExpenseCategories}
          defaultCustomerId={customerId}
          showIncome
          showExpense={false}
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <TransactionsTable
          rows={result.rows}
          customers={customers}
          suppliers={suppliers}
          products={products}
          recentIncomeCategories={recentIncomeCategories}
          recentExpenseCategories={recentExpenseCategories}
        />

        {result.totalPages > 1 && (
          <div className="flex items-center justify-between text-sm pt-2">
            <p className="text-muted-foreground">
              Página {result.page} de {result.totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={result.page <= 1}
                onClick={() => goPage(result.page - 1)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={result.page >= result.totalPages}
                onClick={() => goPage(result.page + 1)}
              >
                Próxima
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
