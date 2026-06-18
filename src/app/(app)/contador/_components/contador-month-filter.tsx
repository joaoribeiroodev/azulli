"use client"

import { useMemo, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function ContadorMonthFilter() {
  const router = useRouter()
  const sp = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const month = sp.get("month") ?? "all"

  const monthOptions = useMemo(() => {
    const fmt = new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      year: "numeric",
    })
    const now = new Date()
    const options: Array<{ value: string; label: string }> = []
    for (let i = 0; i < 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      const label = fmt
        .format(d)
        .replace(/^\w/, (c) => c.toUpperCase())
      options.push({ value, label })
    }
    return options
  }, [])

  function onMonthChange(value: string) {
    const params = new URLSearchParams(sp.toString())
    if (!value || value === "all") params.delete("month")
    else params.set("month", value)
    params.delete("page")
    startTransition(() => router.push(`/contador?${params.toString()}`))
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Label className="text-sm text-muted-foreground shrink-0">
        Período (mês do pagamento)
      </Label>
      <Select
        value={month}
        onValueChange={onMonthChange}
        disabled={isPending}
      >
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="Todos os meses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os meses</SelectItem>
          {monthOptions.map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
