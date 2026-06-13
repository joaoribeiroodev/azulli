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
import type { PaginatedTransactions } from "@/lib/financial/queries"

type Props = {
  customerId: string
  customerName: string
  result: PaginatedTransactions
}

export function CustomerTransactions({ result }: Props) {
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
      <CardHeader>
        <CardTitle className="text-base">Histórico de lançamentos</CardTitle>
        <CardDescription>
          {result.total === 0
            ? "Sem movimentações ainda"
            : `${result.total} ${
                result.total === 1 ? "lançamento" : "lançamentos"
              }`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <TransactionsTable rows={result.rows} />

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
