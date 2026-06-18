"use client"

import { useTransition, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Props = {
  categories?: string[]
}

export function TransactionsFilters({ categories = [] }: Props) {
  const router = useRouter()
  const sp = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const type = sp.get("type") ?? "all"
  const status = sp.get("status") ?? "all"
  const category = sp.get("category") ?? "all"
  const month = sp.get("month") ?? "all"
  const from = sp.get("from") ?? ""
  const to = sp.get("to") ?? ""

  const monthOptions = useMemo(() => {
    const fmt = new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      year: "numeric",
    })
    const now = new Date()
    const options: Array<{ value: string; label: string }> = []
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      const label = fmt
        .format(d)
        .replace(/^\w/, (c) => c.toUpperCase())
      options.push({ value, label })
    }
    return options
  }, [])

  function update(patch: Record<string, string | undefined>) {
    const params = new URLSearchParams(sp.toString())
    for (const [key, value] of Object.entries(patch)) {
      if (!value || value === "all" || value === "") params.delete(key)
      else params.set(key, value)
    }
    if (patch.month && patch.month !== "all") {
      params.delete("from")
      params.delete("to")
    }
    if (patch.from || patch.to) {
      params.delete("month")
    }
    params.delete("page")
    startTransition(() => router.push(`?${params.toString()}`))
  }

  function clearAll() {
    startTransition(() => router.push("?"))
  }

  const hasFilters =
    type !== "all" ||
    status !== "all" ||
    category !== "all" ||
    month !== "all" ||
    from ||
    to

  return (
    <section className="rounded-xl border bg-card p-3 sm:p-4 space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 [&>div]:min-w-0">
        <div className="space-y-1.5">
          <Label className="text-xs">Tipo</Label>
          <Select
            value={type}
            onValueChange={(v) => update({ type: v })}
            disabled={isPending}
          >
            <SelectTrigger className="w-full">
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
            value={status}
            onValueChange={(v) => update({ status: v })}
            disabled={isPending}
          >
            <SelectTrigger className="w-full">
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

        {/* Categoria ocupa linha inteira no mobile (col-span-2) */}
        <div className="space-y-1.5 col-span-2 sm:col-span-1">
          <Label className="text-xs">Categoria</Label>
          <Select
            value={category}
            onValueChange={(v) => update({ category: v })}
            disabled={isPending}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="__uncategorized">Sem categoria</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 col-span-2 sm:col-span-3 lg:col-span-1">
          <Label className="text-xs">Mês</Label>
          <Select
            value={month}
            onValueChange={(v) => update({ month: v })}
            disabled={isPending}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Qualquer mês</SelectItem>
              {monthOptions.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2 sm:col-span-3 lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 min-w-0">
          <div className="space-y-1.5 min-w-0">
            <Label className="text-xs">De</Label>
            <Input
              type="date"
              value={from}
              onChange={(e) => update({ from: e.target.value })}
              disabled={isPending || month !== "all"}
              className="w-full min-w-0 max-w-full"
            />
          </div>

          <div className="space-y-1.5 min-w-0">
            <Label className="text-xs">Até</Label>
            <Input
              type="date"
              value={to}
              onChange={(e) => update({ to: e.target.value })}
              disabled={isPending || month !== "all"}
              className="w-full min-w-0 max-w-full"
            />
          </div>
        </div>
      </div>

      {hasFilters && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            disabled={isPending}
            className="text-xs h-7 gap-1"
          >
            <X className="h-3 w-3" />
            Limpar filtros
          </Button>
        </div>
      )}
    </section>
  )
}
