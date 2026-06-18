"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

type Props = {
  page: number
  totalPages: number
  total: number
  basePath?: string
}

export function TransactionsPagination({
  page,
  totalPages,
  total,
  basePath = "/lancamentos",
}: Props) {
  const router = useRouter()
  const sp = useSearchParams()

  function go(newPage: number) {
    const params = new URLSearchParams(sp.toString())
    if (newPage <= 1) params.delete("page")
    else params.set("page", String(newPage))
    router.push(`${basePath}?${params.toString()}`)
  }

  if (total === 0) return null

  return (
    <div className="flex items-center justify-between text-sm">
      <p className="text-muted-foreground">
        Página {page} de {totalPages} · {total}{" "}
        {total === 1 ? "lançamento" : "lançamentos"}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => go(page - 1)}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => go(page + 1)}
        >
          Próxima
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  )
}