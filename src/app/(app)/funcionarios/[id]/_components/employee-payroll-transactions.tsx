"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight, Info } from "lucide-react"

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
  employeeName: string
  result: PaginatedTransactions
}

export function EmployeePayrollTransactions({ employeeName, result }: Props) {
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
        <CardTitle className="text-base">Histórico de pagamentos</CardTitle>
        <CardDescription className="flex items-start gap-2">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden />
          <span>
            Despesas com &quot;{employeeName}&quot; na descrição ou categoria de
            folha/salário. Para vincular, use o botão &quot;Registrar salário&quot;.
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {result.total === 0 ? (
          <div className="rounded-lg border bg-muted/30 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhum pagamento encontrado para este funcionário.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Crie uma despesa com descrição &quot;Salário — {employeeName}&quot;.
            </p>
          </div>
        ) : (
          <>
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
          </>
        )}
      </CardContent>
    </Card>
  )
}
