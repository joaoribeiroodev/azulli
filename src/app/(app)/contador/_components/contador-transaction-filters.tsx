"use client"

import { useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function ContadorTransactionFilters() {
  const router = useRouter()
  const sp = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const type = sp.get("type") ?? "all"
  const status = sp.get("status") ?? "all"

  function update(patch: Record<string, string | undefined>) {
    const params = new URLSearchParams(sp.toString())
    for (const [key, value] of Object.entries(patch)) {
      if (!value || value === "all") params.delete(key)
      else params.set(key, value)
    }
    params.delete("page")
    startTransition(() => router.push(`/contador?${params.toString()}`))
  }

  const hasFilters = type !== "all" || status !== "all"

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Tipo</Label>
        <Select
          value={type}
          onValueChange={(v) => update({ type: v })}
          disabled={isPending}
        >
          <SelectTrigger className="w-[140px] h-9">
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
        <Label className="text-xs text-muted-foreground">Status</Label>
        <Select
          value={status}
          onValueChange={(v) => update({ status: v })}
          disabled={isPending}
        >
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="paid">Pagos</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="overdue">Vencidos</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {hasFilters && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 gap-1"
          onClick={() => update({ type: "all", status: "all" })}
          disabled={isPending}
        >
          <X className="h-4 w-4" aria-hidden />
          Limpar
        </Button>
      )}
    </div>
  )
}
