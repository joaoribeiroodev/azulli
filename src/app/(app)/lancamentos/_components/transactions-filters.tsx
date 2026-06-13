"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function TransactionsFilters() {
  const router = useRouter()
  const sp = useSearchParams()
  const [, startTransition] = useTransition()

  function update(key: string, value: string | null) {
    const params = new URLSearchParams(sp.toString())
    if (!value || value === "all") {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    params.delete("page") // reset paginação ao mudar filtro
    startTransition(() => router.push(`/lancamentos?${params.toString()}`))
  }

  function clearAll() {
    startTransition(() => router.push("/lancamentos"))
  }

  const hasAnyFilter =
    !!sp.get("type") || !!sp.get("status") || !!sp.get("from") || !!sp.get("to")

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
        <div className="space-y-1.5">
          <Label className="text-xs">Tipo</Label>
          <Select
            value={sp.get("type") ?? "all"}
            onValueChange={(v) => update("type", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="income">Receitas</SelectItem>
              <SelectItem value="expense">Despesas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Status</Label>
          <Select
            value={sp.get("status") ?? "all"}
            onValueChange={(v) => update("status", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="overdue">Vencido</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">De</Label>
          <Input
            type="date"
            value={sp.get("from") ?? ""}
            onChange={(e) => update("from", e.target.value || null)}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Até</Label>
          <Input
            type="date"
            value={sp.get("to") ?? ""}
            onChange={(e) => update("to", e.target.value || null)}
          />
        </div>

        <div>
          {hasAnyFilter && (
            <Button
              variant="ghost"
              onClick={clearAll}
              className="w-full gap-2 text-muted-foreground"
            >
              <X className="h-4 w-4" />
              Limpar
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}