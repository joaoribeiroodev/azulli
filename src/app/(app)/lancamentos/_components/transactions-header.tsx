"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, ArrowDownRight, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TransactionDialog } from "@/components/app/transaction-dialog"
import { ExportButton } from "./export-button"
import type { ProductLite } from "@/lib/products/queries"

type Party = { id: string; name: string }

type Props = {
  customers: Party[]
  suppliers: Party[]
  products?: ProductLite[]
  recentIncomeCategories?: string[]
  recentExpenseCategories?: string[]
}

export function TransactionsHeader({
  customers,
  suppliers,
  products = [],
  recentIncomeCategories = [],
  recentExpenseCategories = [],
}: Props) {
  const [open, setOpen] = useState<"income" | "expense" | null>(null)

  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-brand-ink">
          Lançamentos
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Todas as suas movimentações em um lugar só.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 w-full sm:w-auto sm:justify-end">
        <ExportButton />
        <Button variant="outline" asChild className="gap-2">
          <Link href="/lancamentos/importar">
            <Upload className="h-4 w-4" />
            Importar OFX
          </Link>
        </Button>
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
          suppliers={suppliers}
          products={products}
          recentCategories={
            open === "income" ? recentIncomeCategories : recentExpenseCategories
          }
        />
      </div>
    </header>
  )
}
