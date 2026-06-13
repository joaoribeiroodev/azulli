"use client"

import { useState } from "react"
import { Plus, ArrowDownRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TransactionDialog } from "@/components/app/transaction-dialog"

type Props = { customers: { id: string; name: string }[] }

export function TransactionsHeader({ customers }: Props) {
  const [open, setOpen] = useState<"income" | "expense" | null>(null)

  return (
    <header className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-brand-ink">
          Lançamentos
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Todas as suas movimentações em um lugar só.
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => setOpen("expense")}
          className="gap-2"
        >
          <ArrowDownRight className="h-4 w-4" />
          Nova despesa
        </Button>
        <Button
          onClick={() => setOpen("income")}
          className="bg-brand hover:bg-brand-hover gap-2"
        >
          <Plus className="h-4 w-4" />
          Nova receita
        </Button>

        <TransactionDialog
          open={open !== null}
          type={open ?? "income"}
          onOpenChange={(o) => !o && setOpen(null)}
          customers={customers}
        />
      </div>
    </header>
  )
}