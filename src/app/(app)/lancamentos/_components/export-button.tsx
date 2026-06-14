"use client"

import { useSearchParams } from "next/navigation"
import { Download } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

/**
 * Exporta lançamentos em XLSX respeitando os filtros aplicados (incluindo mês).
 */
export function ExportButton() {
  const sp = useSearchParams()

  function buildUrl(typeOverride?: "income" | "expense") {
    const params = new URLSearchParams()

    const type = typeOverride ?? sp.get("type")
    if (type && type !== "all") params.set("type", type)

    const status = sp.get("status")
    if (status && status !== "all") params.set("status", status)

    const category = sp.get("category")
    if (category && category !== "all") params.set("category", category)

    const month = sp.get("month")
    if (month && month !== "all") params.set("month", month)

    const from = sp.get("from")
    if (from) params.set("from", from)

    const to = sp.get("to")
    if (to) params.set("to", to)

    const qs = params.toString()
    return `/api/export/transactions${qs ? `?${qs}` : ""}`
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>Exportar como planilha (XLSX)</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href={buildUrl()} download>
            Tudo (com filtros atuais)
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={buildUrl("income")} download>
            Só entradas
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={buildUrl("expense")} download>
            Só saídas
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
