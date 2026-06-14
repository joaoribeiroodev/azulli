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
 * Botão de exportação que respeita os filtros aplicados na tela.
 * Permite escolher: tudo, só entradas, só saídas.
 *
 * Dica: usar <a> com download dispara o GET no route handler;
 * o navegador faz o save-as automaticamente.
 */
export function ExportButton() {
  const sp = useSearchParams()

  function buildUrl(typeOverride?: "income" | "expense") {
    const params = new URLSearchParams()

    const type = typeOverride ?? sp.get("type")
    if (type && type !== "all") params.set("type", type)

    const status = sp.get("status")
    if (status && status !== "all") params.set("status", status)

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
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Exportar como CSV</DropdownMenuLabel>
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
